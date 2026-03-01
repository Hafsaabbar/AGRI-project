const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function getFullConstraint() {
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
             WHERE TABLE_NAME = 'DELIVERY_NOTES' AND CONSTRAINT_TYPE = 'C' AND SEARCH_CONDITION LIKE '%DELIVERY_STATUS%'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_ARRAY, fetchInfo: { "SEARCH_CONDITION": { type: oracledb.STRING } } }
        );

        if (result.rows.length > 0) {
            console.log('FULL_CONSTRAINT_CONDITION:' + JSON.stringify(result.rows[0][0]));
        } else {
            console.log('No DELIVERY_STATUS constraint found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.close();
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

getFullConstraint();
