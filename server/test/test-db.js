const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const walletPath = path.resolve(__dirname, 'wallet');

async function test() {
    console.log('Testing connection with:');
    console.log('User:', process.env.DB_USER);
    console.log('Wallet:', walletPath);

    try {
        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD
        });
        console.log('✅ Success: Pool created');

        const connection = await oracledb.getConnection();
        console.log('✅ Success: Connection established');

        const result = await connection.execute('SELECT sysdate FROM dual');
        console.log('✅ Success: Query executed', result.rows[0]);

        await connection.close();
        await oracledb.getPool().close(0);
        console.log('✅ All done');
    } catch (err) {
        console.error('❌ Error testing connection:', err);
    }
}

test();
