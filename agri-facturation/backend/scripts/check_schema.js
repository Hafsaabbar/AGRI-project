const db = require('../config/database');

async function checkSchema() {
    try {
        await db.initialize();
        const result = await db.execute(`
            SELECT column_name, data_type 
            FROM user_tab_columns 
            WHERE table_name = 'ORDER_INVOICES'
            ORDER BY column_name
        `);
        console.log('Columns in ORDER_INVOICES:');
        result.rows.forEach(r => console.log(`- ${r.COLUMN_NAME} (${r.DATA_TYPE})`));
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        await db.close();
    }
}

checkSchema();
