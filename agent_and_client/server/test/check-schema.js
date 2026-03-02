const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function checkSchema() {
    let connection;
    try {
        console.log('Checking ORDERS table schema...');

        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD
        });

        connection = await oracledb.getConnection();

        const result = await connection.execute(
            `SELECT COLUMN_NAME, DATA_TYPE FROM USER_TAB_COLUMNS WHERE TABLE_NAME = 'ORDERS'`
        );

        console.log('Columns in ORDERS table:');
        result.rows.forEach(row => {
            console.log(`- ${row[0]} (${row[1]})`);
        });

        const constraints = await connection.execute(
            `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, SEARCH_CONDITION FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'ORDERS'`
        );
        console.log('\nConstraints on ORDERS table:');
        constraints.rows.forEach(row => {
            console.log(`- ${row[0]} (${row[1]}): ${row[2] || ''}`);
        });

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

checkSchema();
