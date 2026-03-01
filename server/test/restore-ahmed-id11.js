const db = require('../config/db');
const oracledb = require('oracledb');

async function restoreAhmed() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();

        console.log('Restoring Client ID 11 (ahmed@gmail.com)...');

        const updateSql = `
            UPDATE clients 
            SET nom_client = :nom, 
                prenom = :prenom, 
                entreprise = :entreprise, 
                tel = :tel, 
                ville = :ville, 
                adresse = :adresse, 
                code_postal = :code_postal,
                type_client = :type_client
            WHERE id = 11
        `;

        await connection.execute(updateSql, {
            nom: 'Alami',
            prenom: 'Ahmed',
            entreprise: 'Transport Alami',
            tel: '0661123123',
            ville: 'Casablanca',
            adresse: 'Hay Hassani, Rue 12',
            code_postal: '20200',
            type_client: 'PROFESSIONNEL'
        }, { autoCommit: true });

        console.log('✅ Restored Client ID 11 to Ahmed Alami');

        await connection.close();
        await db.close();
    } catch (err) {
        console.error(err);
    }
}

restoreAhmed();
