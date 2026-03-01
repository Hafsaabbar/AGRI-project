const db = require('../config/db');
const oracledb = require('oracledb');

async function findAhmed() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();

        const result = await connection.execute(
            `SELECT id, nom_client, prenom, email FROM clients WHERE LOWER(email) LIKE '%ahmed%' OR LOWER(nom_client) LIKE '%ahmed%' OR LOWER(prenom) LIKE '%ahmed%'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log('Found clients:', result.rows);

        await connection.close();
        await db.close();
    } catch (err) {
        console.error(err);
    }
}

findAhmed();
