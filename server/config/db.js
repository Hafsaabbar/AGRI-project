const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, '../wallet');

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // Prefer TNS alias if wallet is available, else fallback to env var
    connectString: 'agrimartdb_high',
    walletLocation: walletPath
};

async function initialize() {
    try {
        await oracledb.createPool({
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString,
            configDir: walletPath, // Directory containing tnsnames.ora
            walletLocation: walletPath, // Directory containing cwallet.sso
            walletPassword: process.env.WALLET_PASSWORD,
            poolMin: 1,
            poolMax: 10,
            poolIncrement: 1
        });
        console.log('Oracle Database pool created');
    } catch (err) {
        console.error('Error creating database pool', err);
        console.error('Do not forget to whitelist your IP in Oracle Cloud Console if using ADB.');
        process.exit(1);
    }
}

async function close() {
    try {
        await oracledb.getPool().close(10);
        console.log('Oracle Database pool closed');
    } catch (err) {
        console.error('Error closing database pool', err);
    }
}

function getPool() {
    return oracledb.getPool();
}

module.exports = { initialize, close, getPool };
