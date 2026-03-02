const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function debugSchema() {
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

        console.log('--- DELIVERY_NOTES Columns ---');
        const cols = await connection.execute(
            `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
             FROM USER_TAB_COLUMNS 
             WHERE TABLE_NAME = 'DELIVERY_NOTES'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log(JSON.stringify(cols.rows, null, 2));

        console.log('\n--- DELIVERY_NOTES Constraints ---');
        const constraints = await connection.execute(
            `SELECT CONSTRAINT_NAME, SEARCH_CONDITION 
             FROM USER_CONSTRAINTS 
             WHERE TABLE_NAME = 'DELIVERY_NOTES' AND CONSTRAINT_TYPE = 'C'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchInfo: { "SEARCH_CONDITION": { type: oracledb.STRING } } }
        );
        console.log(JSON.stringify(constraints.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.close();
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

debugSchema();
