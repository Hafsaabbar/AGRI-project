const db = require('../config/db');
const oracledb = require('oracledb');

async function listEmails() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();

        const result = await connection.execute(
            `SELECT id, nom_client, prenom, email FROM clients ORDER BY id`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.table(result.rows);

        await connection.close();
        await db.close();
    } catch (err) {
        console.error(err);
    }
}

listEmails();
