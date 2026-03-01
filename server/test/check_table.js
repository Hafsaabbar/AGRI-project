const oracledb = require('oracledb');
const db = require('../config/db');

async function checkTable() {
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `SELECT table_name FROM user_tables WHERE table_name = 'DELIVERY_NOTE_ITEMS'`;
        const result = await connection.execute(sql);
        if (result.rows.length > 0) {
            console.log("TABLE_EXISTS");
        } else {
            console.log("TABLE_MISSING");
        }
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) await connection.close();
        process.exit(0);
    }
}

checkTable();
