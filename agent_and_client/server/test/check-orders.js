const db = require('../config/db');
const oracledb = require('oracledb');

async function checkOrdersSchema() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();

        // desc tables or select * from orders where rownum = 1
        const result = await connection.execute(
            `SELECT * FROM orders FETCH FIRST 1 ROWS ONLY`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log('Order Sample:', result.rows);

        await connection.close();
        await db.close();
    } catch (err) {
        console.error(err);
    }
}

checkOrdersSchema();
