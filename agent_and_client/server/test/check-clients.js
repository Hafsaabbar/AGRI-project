const db = require('../config/db');
const oracledb = require('oracledb');

async function checkClients() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();

        const result = await connection.execute(
            `SELECT id, nom_client, prenom, email, tel, ville, entreprise FROM clients`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log('Current Clients:');
        console.table(result.rows);

        await connection.close();
        await db.close();
    } catch (err) {
        console.error(err);
    }
}

checkClients();
