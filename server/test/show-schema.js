const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

async function showSchema() {
    const walletPath = path.resolve(__dirname, 'wallet');
    let connection;

    try {
        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD
        });

        connection = await oracledb.getConnection();

        // Get all tables
        const tables = await connection.execute(
            `SELECT table_name FROM user_tables ORDER BY table_name`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log('=== DATABASE TABLES ===');
        for (const t of tables.rows) {
            console.log(`\n📋 ${t.TABLE_NAME}`);

            // Get columns for each table
            const cols = await connection.execute(
                `SELECT column_name, data_type, nullable FROM user_tab_columns WHERE table_name = :tbl ORDER BY column_id`,
                [t.TABLE_NAME],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            cols.rows.forEach(c => {
                console.log(`   - ${c.COLUMN_NAME} (${c.DATA_TYPE}) ${c.NULLABLE === 'N' ? 'NOT NULL' : ''}`);
            });
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.close();
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

showSchema();
