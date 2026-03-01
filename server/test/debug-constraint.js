const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function findConstraint() {
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

        console.log('Finding constraint SYS_C0028628...');
        const result = await connection.execute(
            `SELECT SEARCH_CONDITION, TABLE_NAME 
             FROM USER_CONSTRAINTS 
             WHERE CONSTRAINT_NAME = 'SYS_C0028628'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchInfo: { "SEARCH_CONDITION": { type: oracledb.STRING } } }
        );

        if (result.rows.length > 0) {
            console.log('Constraint found:');
            console.log('Table:', result.rows[0].TABLE_NAME);
            console.log('Condition:', result.rows[0].SEARCH_CONDITION);
        } else {
            console.log('Constraint not found by name SYS_C0028628.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.close();
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

findConstraint();
