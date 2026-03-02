const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function listTables() {
    let connection;
    try {
        console.log('Listing Tables...');

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
            `SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME`
        );

        console.log('Tables:');
        result.rows.forEach(row => {
            console.log(`- ${row[0]}`);
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

listTables();
