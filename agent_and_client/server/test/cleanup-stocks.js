const db = require('../config/db');

async function cleanup() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();

        try {
            await connection.execute('DROP TABLE AGENCE_STOCKS');
            console.log('✅ Table AGENCE_STOCKS dropped');
        } catch (e) {
            console.log('ℹ️ Table AGENCE_STOCKS does not exist or already dropped');
        }

        await connection.close();
        await db.close();
    } catch (err) {
        console.error(err);
    }
}

cleanup();
