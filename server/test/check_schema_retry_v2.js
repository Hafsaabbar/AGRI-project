const oracledb = require('oracledb');
const db = require('../config/db');

async function checkSchema() {
    let connection;
    try {
        await db.initialize();
        connection = await db.getPool().getConnection();
        const tables = ['DELIVERY_NOTES', 'ORDER_INVOICES'];

        for (const table of tables) {
            try {
                const result = await connection.execute(
                    `SELECT COLUMN_NAME FROM user_tab_columns WHERE table_name = :t ORDER BY COLUMN_ID`,
                    { t: table }
                );
                console.log(`--- TABLE: ${table} ---`);
                result.rows.forEach(r => console.log(`COL:${r[0]}`));
            } catch (err) {
                console.log(`ERROR:${table}|${err.message}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) await connection.close();
        await db.close();
        process.exit(0);
    }
}
checkSchema();
