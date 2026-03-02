const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function checkStatusConstraint() {
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
            `SELECT SEARCH_CONDITION 
             FROM USER_CONSTRAINTS 
             WHERE TABLE_NAME = 'DELIVERY_NOTES' AND CONSTRAINT_TYPE = 'C'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_ARRAY, fetchInfo: { "SEARCH_CONDITION": { type: oracledb.STRING } } }
        );

        result.rows.forEach(row => {
            console.log('CONSTRAINT_CONDITION:', row[0]);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.close();
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

checkStatusConstraint();
