const db = require('../config/db');
const oracledb = require('oracledb');

async function restoreAhmed() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();

        // Restore Client ID 1 to Ahmed
        const updateSql = `
            UPDATE clients 
            SET nom_client = :nom, 
                prenom = :prenom, 
                email = :email,
                entreprise = :entreprise, 
                tel = :tel, 
                ville = :ville, 
                adresse = :adresse, 
                code_postal = :code_postal,
                type_client = :type_client
            WHERE id = 1
        `;

        await connection.execute(updateSql, {
            nom: 'Alami',
            prenom: 'Ahmed',
            email: 'ahmed@gmail.com',
            entreprise: 'Ferme Ahmed',
            tel: '0661000001',
            ville: 'Casablanca',
            adresse: '123 Route de Mediouna',
            code_postal: '20000',
            type_client: 'AGRICULTEUR'
        }, { autoCommit: true });

        console.log('✅ Restored Client ID 1 to Ahmed Alami');

        await connection.close();
        await db.close();
    } catch (err) {
        console.error(err);
    }
}

restoreAhmed();
