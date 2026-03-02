const oracledb = require('oracledb');
const db = require('../config/db');

async function checkColumns() {
    let connection;
    try {
        connection = await db.getPool().getConnection();
        // Get one row to see columns
        const sql = `SELECT * FROM order_items FETCH FIRST 1 ROWS ONLY`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length > 0) {
            console.log("COLUMNS:", Object.keys(result.rows[0]).join(", "));
        } else {
            console.log("NO_ROWS_BUT_SUCCESS");
            // If empty, try to get metadata
            const result2 = await connection.execute(sql);
            console.log("META:", result2.metaData.map(c => c.name).join(", "));
        }
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) await connection.close();
        process.exit(0);
    }
}

checkColumns();
