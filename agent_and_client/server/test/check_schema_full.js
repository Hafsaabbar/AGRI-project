const oracledb = require('oracledb');
const db = require('../config/db');

async function checkSchema() {
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const tables = ['PRODUCTS', 'ORDER_ITEMS', 'DELIVERY_NOTE_ITEMS', 'ORDERS', 'DELIVERY_NOTES'];

        for (const table of tables) {
            console.log(`\n--- ${table} ---`);
            try {
                // Try to get one row to see columns (or use all_tab_columns if reliable, but simpler to select * row 1)
                const result = await connection.execute(`SELECT * FROM ${table} FETCH FIRST 1 ROWS ONLY`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
                if (result.rows.length > 0) {
                    console.log("Columns:", Object.keys(result.rows[0]).join(", "));
                } else {
                    // If empty, try metadata extraction
                    const metaResult = await connection.execute(`SELECT * FROM ${table} WHERE 1=0`);
                    console.log("Columns (Metadata):", metaResult.metaData.map(c => c.name).join(", "));
                }
            } catch (err) {
                console.log(`Error checking ${table}:`, err.message);
            }
        }

    } catch (err) {
        console.error("Global Error:", err);
    } finally {
        if (connection) await connection.close();
        process.exit(0);
    }
}

checkSchema();
