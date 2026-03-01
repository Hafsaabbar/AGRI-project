const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function checkConstraints() {
    let connection;
    try {
        console.log('Checking Constraints Names on ORDERS table...');

        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD
        });

        connection = await oracledb.getConnection();

        const constraints = await connection.execute(
            `SELECT CONSTRAINT_NAME FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'ORDERS' AND CONSTRAINT_TYPE = 'C'`
        );
        console.log('Constraint Names:', constraints.rows);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

checkConstraints();
