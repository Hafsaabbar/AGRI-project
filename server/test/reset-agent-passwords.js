const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function resetPasswords() {
    let connection;
    try {
        console.log('Resetting agent passwords...');

        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD
        });

        connection = await oracledb.getConnection();

        // Generate new hash for 'agent123'
        const passwordToSet = 'agent123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordToSet, salt);

        console.log(`Generated new hash for '${passwordToSet}':`, hashedPassword);

        // Update all agents
        const result = await connection.execute(
            `UPDATE AGENTS SET PASSWORD = :pw`,
            [hashedPassword],
            { autoCommit: true }
        );

        console.log(`✅ Updated ${result.rowsAffected} agents with new password.`);

        // Verify by comparing immediately (sanity check)
        const check = await connection.execute(
            `SELECT PASSWORD FROM AGENTS WHERE ROWNUM = 1`
        );
        if (check.rows.length > 0) {
            const storedHash = check.rows[0][0]; // or .PASSWORD depending on format
            const match = await bcrypt.compare(passwordToSet, storedHash);
            console.log(`Sanity Check: Password matches? ${match ? 'YES' : 'NO'}`);
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

resetPasswords();
