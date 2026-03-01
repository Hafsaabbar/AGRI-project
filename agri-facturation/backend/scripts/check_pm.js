const db = require('../config/database');

async function checkPaymentMethod() {
    try {
        await db.initialize();
        const result = await db.execute(`
            SELECT column_name, data_type 
            FROM user_tab_columns 
            WHERE table_name = 'ORDER_INVOICES' 
            AND column_name = 'PAYMENT_METHOD'
        `);
        console.log('PAYMENT_METHOD Check:', result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await db.close();
    }
}

checkPaymentMethod();
