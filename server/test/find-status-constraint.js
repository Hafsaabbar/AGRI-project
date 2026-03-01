const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function findStatusConstraint() {
    let connection;
    try {
        console.log('Finding STATUS constraint...');

        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD,
            fetchAsString: [oracledb.CLOB]
        });

        connection = await oracledb.getConnection();

        const result = await connection.execute(
            `SELECT CONSTRAINT_NAME, SEARCH_CONDITION FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'ORDERS' AND CONSTRAINT_TYPE = 'C'`
        );

        for (const row of result.rows) {
            const condition = row[1]; // SEARCH_CONDITION
            if (condition && condition.includes('PENDING')) {
                console.log('FOUND STATUS CONSTRAINT:', row[0]);
                console.log('Condition:', condition);
            }
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

findStatusConstraint();
