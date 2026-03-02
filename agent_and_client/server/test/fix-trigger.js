const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function fixTrigger() {
    let connection;
    try {
        console.log('Dropping invalid trigger TRG_COMMANDES_UPDATED...');

        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD
        });

        connection = await oracledb.getConnection();

        try {
            await connection.execute(`DROP TRIGGER TRG_COMMANDES_UPDATED`);
            console.log('✅ Trigger TRG_COMMANDES_UPDATED dropped successfully.');
        } catch (err) {
            console.error('Error dropping trigger:', err.message);
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

fixTrigger();
