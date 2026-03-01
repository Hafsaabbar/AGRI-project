const db = require('../config/db');
const oracledb = require('oracledb');

async function checkId1() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();

        const result = await connection.execute(
            `SELECT id, nom_client, prenom, email FROM clients WHERE id = 1`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log('Client 1:', result.rows);

        await connection.close();
        await db.close();
    } catch (err) {
        console.error(err);
    }
}

checkId1();
