const db = require('../config/database');

async function checkCasing() {
    try {
        await db.initialize();

        console.log('--- CHECK COLUMN CASING ---');
        const result = await db.execute(`
            SELECT table_name, column_name 
            FROM user_tab_columns 
            WHERE table_name = 'ORDER_INVOICES'
            ORDER BY column_name
        `);

        result.rows.forEach(row => {
            console.log(`Table: ${row.TABLE_NAME}, Column: "${row.COLUMN_NAME}"`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await db.close();
    }
}

checkCasing();
