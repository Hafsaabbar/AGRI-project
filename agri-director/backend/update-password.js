const oracledb = require('oracledb');
const config = require('./config/config');

oracledb.initOracleClient({ configDir: config.walletPath });

async function resetPassword() {
    let connection;
    try {
        console.log('Connexion...');
        connection = await oracledb.getConnection({
            user: config.user,
            password: config.password,
            connectString: config.connectionString
        });

        console.log('Mise à jour du mot de passe pour directeur@agri.ma ...');

        // 1. Vérifier si l'utilisateur existe
        const result = await connection.execute(
            `SELECT email FROM clients WHERE email = 'directeur@agri.ma'`
        );

        if (result.rows.length === 0) {
            console.log('L\'utilisateur directeur@agri.ma n\'existe pas. Création...');
            await connection.execute(`
                INSERT INTO clients (email, password, nom_client, prenom, role, status, type_client)
                VALUES ('directeur@agri.ma', 'Admin123!', 'Directeur', 'AGRI', 'ADMIN', 'APPROVED', 'PROFESSIONNEL')
            `);
        } else {
            console.log('Utilisateur trouvé. Reset du password...');
            await connection.execute(`
                UPDATE clients 
                SET password = 'Admin123!', role = 'ADMIN', status = 'APPROVED'
                WHERE email = 'directeur@agri.ma'
            `);
        }

        await connection.commit();
        console.log('✅ Mot de passe mis à jour avec succès: Admin123!');

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

resetPassword();
