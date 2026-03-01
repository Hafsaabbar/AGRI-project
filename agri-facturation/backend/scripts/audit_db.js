const db = require('../config/database');

async function auditDatabase() {
    try {
        console.log('--- AUDIT BASE DE DONNEES ---');
        await db.initialize();

        // 1. Lister les tables pertinentes
        console.log('\n1. VERIFICATION DES TABLES:');
        const tables = await db.execute(`
            SELECT table_name 
            FROM user_tables 
            WHERE table_name IN ('ORDER_INVOICES', 'MONTHLY_INVOICES', 'INVOICES')
        `);
        console.log('Tables trouvees:', tables.rows);

        const columns = await db.execute(`
            SELECT column_name, data_type, data_length
            FROM user_tab_columns 
            WHERE table_name = 'ORDER_INVOICES'
            ORDER BY column_name
        `);
        console.log('\n2. COLONNES DE ORDER_INVOICES (Total: ' + columns.rows.length + '):');
        columns.rows.forEach(c => console.log(`   [${c.COLUMN_NAME}] ${c.DATA_TYPE}`));

        // 3. Verifier s'il y a des donnees
        console.log('\n3. COMPTAGE DONNEES:');
        const count = await db.execute(`SELECT COUNT(*) as cnt FROM order_invoices`);
        console.log('Nombre de factures dans order_invoices:', count.rows[0].CNT);

    } catch (err) {
        console.error('Erreur audit:', err);
    } finally {
        await db.close();
    }
}

auditDatabase();
