const db = require('../config/database');

async function fixAndVerify() {
    try {
        await db.initialize();

        console.log('--- DEBUT MIGRATION ---');

        // 1. Ajouter payment_method
        try {
            await db.execute(`ALTER TABLE order_invoices ADD payment_method VARCHAR2(50) DEFAULT 'Virement'`);
            console.log('SUCCESS: payment_method ajoutee.');
        } catch (err) {
            if (err.message.includes('ORA-01430')) {
                console.log('INFO: payment_method existe deja.');
            } else {
                console.error('ERREUR payment_method:', err.message);
            }
        }

        // 2. Ajouter paid_date
        try {
            await db.execute(`ALTER TABLE order_invoices ADD paid_date DATE`);
            console.log('SUCCESS: paid_date ajoutee.');
        } catch (err) {
            if (err.message.includes('ORA-01430')) {
                console.log('INFO: paid_date existe deja.');
            } else {
                console.error('ERREUR paid_date:', err.message);
            }
        }

        // 3. Verification immediate
        console.log('--- VERIFICATION ---');
        const result = await db.execute(`
            SELECT column_name 
            FROM user_tab_columns 
            WHERE table_name = 'ORDER_INVOICES' 
            AND column_name IN ('PAID_DATE', 'PAYMENT_METHOD')
        `);
        console.log('Colonnes trouvees:', result.rows);

    } catch (err) {
        console.error('Erreur script:', err);
    } finally {
        await db.close();
    }
}

fixAndVerify();
