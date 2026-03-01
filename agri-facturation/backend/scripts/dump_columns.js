const db = require('../config/database');
const fs = require('fs');

async function dumpColumns() {
    try {
        await db.initialize();
        const result = await db.execute(`
            SELECT column_name, data_type, nullable 
            FROM user_tab_columns 
            WHERE table_name = 'ORDER_INVOICES'
            ORDER BY column_name
        `);

        let output = 'COLUMNS OF ORDER_INVOICES:\n';
        result.rows.forEach(r => {
            output += `${r.COLUMN_NAME} (${r.DATA_TYPE}, Nullable: ${r.NULLABLE})\n`;
        });

        fs.writeFileSync('columns.txt', output);
        console.log('Columns dumped to columns.txt');

    } catch (err) {
        console.error(err);
    } finally {
        await db.close();
    }
}

dumpColumns();
