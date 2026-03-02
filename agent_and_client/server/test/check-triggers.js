const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function checkTriggers() {
    let connection;
    try {
        console.log('Checking Triggers on ORDERS table...');

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
            `SELECT TRIGGER_NAME, STATUS, ACTION_TYPE FROM USER_TRIGGERS WHERE TABLE_NAME = 'ORDERS'`
        );

        console.log('Triggers:');
        result.rows.forEach(row => {
            console.log(`- ${row[0]} (${row[1]}) [Type: ${row[2]}]`);
        });

        // Try to verify validity details if possible (using all_objects)
        const objects = await connection.execute(
            `SELECT OBJECT_NAME, STATUS FROM USER_OBJECTS WHERE OBJECT_TYPE = 'TRIGGER' AND OBJECT_NAME IN (SELECT TRIGGER_NAME FROM USER_TRIGGERS WHERE TABLE_NAME = 'ORDERS')`
        );
        console.log('\nObject Status:');
        objects.rows.forEach(row => {
            console.log(`- ${row[0]}: ${row[1]}`);
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

checkTriggers();
