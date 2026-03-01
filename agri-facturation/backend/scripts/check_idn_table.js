// Script pour verifier la structure de INVOICE_DELIVERY_NOTES
const db = require('../config/database');

async function checkTable() {
    try {
        await db.initialize();
        console.log('Connexion etablie');

        const r = await db.execute(`
            SELECT column_name, data_type, nullable 
            FROM user_tab_columns 
            WHERE table_name = 'INVOICE_DELIVERY_NOTES' 
            ORDER BY column_id
        `);

        console.log('Structure de INVOICE_DELIVERY_NOTES:');
        r.rows.forEach(col => {
            console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.NULLABLE === 'N' ? 'NOT NULL' : 'NULL'}`);
        });

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await db.close();
        process.exit(0);
    }
}

checkTable();
