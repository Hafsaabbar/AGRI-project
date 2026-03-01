// Script pour trouver ou créer un compte directeur
const oracledb = require('oracledb');
const config = require('./config/config');

oracledb.initOracleClient({ configDir: config.walletPath });

async function findOrCreateDirector() {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: config.user,
            password: config.password,
            connectString: config.connectionString
        });

        console.log('=== Recherche du compte Directeur ===\n');

        // Chercher un compte ADMIN existant
        const adminResult = await connection.execute(`
            SELECT id, email, nom_client, prenom, role, password
            FROM clients
            WHERE role = 'ADMIN'
        `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (adminResult.rows.length > 0) {
            console.log('✅ Compte directeur trouvé:\n');
            adminResult.rows.forEach(admin => {
                console.log('   Email:', admin.EMAIL);
                console.log('   Mot de passe:', admin.PASSWORD || '(non défini)');
                console.log('   Nom:', admin.NOM_CLIENT, admin.PRENOM || '');
                console.log('');
            });
        } else {
            console.log('❌ Aucun compte ADMIN trouvé.');
            console.log('\n📝 Création d\'un compte directeur...\n');

            // Créer un compte directeur
            await connection.execute(`
                INSERT INTO clients (email, password, nom_client, prenom, role, status, type_client)
                VALUES ('directeur@agri.ma', 'Admin123!', 'Directeur', 'AGRI', 'ADMIN', 'APPROVED', 'PROFESSIONNEL')
            `);
            await connection.commit();

            console.log('✅ Compte directeur créé avec succès!\n');
            console.log('   Email: directeur@agri.ma');
            console.log('   Mot de passe: Admin123!');
        }

        await connection.close();
    } catch (err) {
        console.error('Erreur:', err.message);
        if (connection) await connection.close();
    }
}

findOrCreateDirector();
