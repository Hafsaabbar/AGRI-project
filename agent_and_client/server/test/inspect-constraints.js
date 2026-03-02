const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function inspectConstraints() {
    let connection;
    try {
        console.log('Inspecting Constraints Definitions...');

        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD,
            fetchAsString: [oracledb.CLOB] // Try to force string fetch?
        });

        connection = await oracledb.getConnection();

        // Loop through the known constraints
        const names = ['SYS_C0028610', 'SYS_C0028611', 'SYS_C0028612', 'SYS_C0028613', 'SYS_C0028609'];

        for (const name of names) {
            // Using logic to get long if needed, but simple select first
            const result = await connection.execute(
                `SELECT SEARCH_CONDITION FROM USER_CONSTRAINTS WHERE CONSTRAINT_NAME = :name`,
                [name]
            );
            // SEARCH_CONDITION in node-oracledb might be returned as string if not too long?
            // If it returns null/undefined, it means trouble.
            console.log(`${name}:`, result.rows[0][0]);
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

inspectConstraints();
