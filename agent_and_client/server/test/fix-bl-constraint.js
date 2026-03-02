const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function fixConstraint() {
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

        console.log('Dropping old constraint SYS_C0028628...');
        try {
            await connection.execute(`ALTER TABLE DELIVERY_NOTES DROP CONSTRAINT SYS_C0028628`);
            console.log('Dropped successfully.');
        } catch (e) {
            console.log('Could not drop (maybe name changed or already gone):', e.message);
        }

        console.log('Adding new constraint for DELIVERY_STATUS...');
        await connection.execute(`
            ALTER TABLE DELIVERY_NOTES 
            ADD CONSTRAINT CHK_BL_STATUS 
            CHECK (DELIVERY_STATUS IN ('PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PARTIELLE', 'COMPLETE'))
        `);
        console.log('New constraint added.');

        await connection.commit();

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) await connection.close();
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

fixConstraint();
