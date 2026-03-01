// Script de test de connexion Oracle Cloud
const oracledb = require('oracledb');
const config = require('./config/config');
const fs = require('fs');
const path = require('path');

async function testConnection() {
    console.log('=== Test de Connexion Oracle Cloud ===\n');

    // 1. Vérifier le chemin du Wallet
    console.log('1. Vérification du Wallet...');
    console.log('   Chemin configuré:', config.walletPath);

    if (fs.existsSync(config.walletPath)) {
        console.log('   ✅ Le dossier Wallet existe');
        const files = fs.readdirSync(config.walletPath);
        console.log('   Fichiers présents:', files.join(', '));

        // Vérifier les fichiers essentiels
        const requiredFiles = ['tnsnames.ora', 'sqlnet.ora', 'cwallet.sso'];
        const missingFiles = requiredFiles.filter(f => !files.includes(f));
        if (missingFiles.length > 0) {
            console.log('   ⚠️ Fichiers manquants:', missingFiles.join(', '));
        } else {
            console.log('   ✅ Tous les fichiers essentiels sont présents');
        }
    } else {
        console.log('   ❌ Le dossier Wallet n\'existe pas!');
        console.log('   Veuillez télécharger le Wallet depuis Oracle Cloud Console');
        return;
    }

    // 2. Initialiser le client Oracle
    console.log('\n2. Initialisation du client Oracle...');
    try {
        oracledb.initOracleClient({ configDir: config.walletPath });
        console.log('   ✅ Client Oracle initialisé');
    } catch (err) {
        if (err.message.includes('already been initialized')) {
            console.log('   ℹ️ Client déjà initialisé');
        } else {
            console.log('   ❌ Erreur:', err.message);
            return;
        }
    }

    // 3. Tenter la connexion
    console.log('\n3. Tentative de connexion à Oracle Cloud...');
    console.log('   Utilisateur:', config.user);
    console.log('   Host: adb.eu-madrid-1.oraclecloud.com');

    try {
        const connection = await oracledb.getConnection({
            user: config.user,
            password: config.password,
            connectString: config.connectionString
        });

        console.log('   ✅ Connexion établie avec succès!');

        // Test simple
        const result = await connection.execute('SELECT SYSDATE, USER FROM dual');
        console.log('\n4. Test de requête:');
        console.log('   Date serveur:', result.rows[0][0]);
        console.log('   Utilisateur connecté:', result.rows[0][1]);

        // Vérifier les tables disponibles
        const tables = await connection.execute(`
            SELECT table_name FROM user_tables ORDER BY table_name
        `);
        console.log('\n5. Tables disponibles:');
        tables.rows.forEach(row => console.log('   -', row[0]));

        await connection.close();
        console.log('\n✅ Test terminé avec succès');

    } catch (err) {
        console.log('   ❌ Erreur de connexion:', err.message);
        console.log('\n   Code erreur:', err.errorNum);

        if (err.errorNum === 12170) {
            console.log('\n   Diagnostic ORA-12170 (TNS timeout):');
            console.log('   → Vérifiez votre connexion internet');
            console.log('   → Vérifiez que le firewall autorise le port 1522');
            console.log('   → Vérifiez que l\'adresse Oracle Cloud est accessible');
        } else if (err.errorNum === 1017) {
            console.log('\n   Diagnostic ORA-1017:');
            console.log('   → Identifiants incorrects (user/password)');
        } else if (err.errorNum === 28759) {
            console.log('\n   Diagnostic ORA-28759:');
            console.log('   → Problème de configuration SSL/Wallet');
        }
    }
}

testConnection();
