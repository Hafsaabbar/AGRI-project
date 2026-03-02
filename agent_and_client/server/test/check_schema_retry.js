const oracledb = require('oracledb');
const db = require('../config/db');

async function checkSchema() {
    let connection;
    try {
        console.log("INITIALIZING_DB...");
        await db.initialize(); // Initialize pool first
        console.log("DB_INITIALIZED");

        connection = await db.getPool().getConnection();
        const tables = ['ORDERS'];

        for (const table of tables) {
            try {
                const result = await connection.execute(
                    `SELECT search_condition_vc FROM user_constraints WHERE table_name = :t AND constraint_type = 'C'`,
                    { t: table }
                );
                console.log(`--- CONSTRAINTS: ${table} ---`);
                result.rows.forEach(r => console.log(`CONST:${r[0]}`));
            } catch (err) {
                console.log(`ERROR:${table}|${err.message}`);
            }
        }

    } catch (err) {
        console.error("Global Error:", err);
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
        try { await db.close(); } catch (e) { } // Close pool
        process.exit(0);
    }
}

checkSchema();
