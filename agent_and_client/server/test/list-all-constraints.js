const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function getAllConstraints() {
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

        const result = await connection.execute(
            `SELECT CONSTRAINT_NAME, SEARCH_CONDITION 
             FROM USER_CONSTRAINTS 
             WHERE TABLE_NAME = 'DELIVERY_NOTES' AND CONSTRAINT_TYPE = 'C'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchInfo: { "SEARCH_CONDITION": { type: oracledb.STRING } } }
        );

        console.log('CONSTRAINTS_COUNT: ' + result.rows.length);
        result.rows.forEach(row => {
            console.log(`--- ${row.CONSTRAINT_NAME} ---`);
            console.log(row.SEARCH_CONDITION);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.close();
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

getAllConstraints();
