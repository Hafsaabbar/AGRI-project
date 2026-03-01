const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

async function checkConnection() {
    let connection;

    // Use absolute path for wallet to avoid relative path issues
    const walletPath = path.resolve(__dirname, 'wallet');

    console.log('Testing Oracle Database Connection...');
    console.log(`Wallet Path: ${walletPath}`);

    // We try to use the TNS alias 'agrimartdb_high' which should be in tnsnames.ora
    // This often works better with mTLS as it picks up the security settings
    const connectionString = 'agrimartdb_high';
    console.log(`Attempting to connect via TNS alias: ${connectionString}`);

    try {
        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: connectionString,
            // Thin mode requires walletLocation NOT configDir (though configDir sometimes works)
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD
        });

        connection = await oracledb.getConnection();
        console.log('✅ Successfully connected to Oracle Autonomous Database!');

        const result = await connection.execute('SELECT * FROM v$version');
        console.log('Database Version:', result.rows[0][0]);

    } catch (err) {
        console.error('❌ Connection Failed:', err);
        console.log('\n--- TROUBLESHOOTING ---');
        console.log('1. Check if your current IP Address is allowed in the Oracle Cloud Console (Access Control List).');
        console.log('2. Ensure the Wallet files (cwallet.sso, tnsnames.ora, etc.) are in:', walletPath);
        console.log('3. Verify your DB_PASSWORD is correct.');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
        try {
            await oracledb.getPool().close(0);
        } catch (e) { }
    }
}

checkConnection();
