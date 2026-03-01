const db = require('../config/database');

async function getUsers() {
    try {
        await db.initialize();

        console.log('--- RECHERCHE UTILISATEURS ---');

        // Lister tous les utilisateurs (ou filtrer par role si besoin)
        const result = await db.execute(`
            SELECT id, nom, prenom, email, mot_de_passe, role_id, statut
            FROM utilisateurs
            ORDER BY role_id
        `);

        console.log('Utilisateurs trouvés :');
        result.rows.forEach(u => {
            let role = 'Inconnu';
            if (u.ROLE_ID === 1) role = 'Admin/Directeur';
            if (u.ROLE_ID === 4) role = 'Agent Facturation';

            console.log(`[${role}] ${u.NOM} ${u.PRENOM}`);
            console.log(`  Email: ${u.EMAIL}`);
            console.log(`  Pass : ${u.MOT_DE_PASSE}`);
            console.log(`  Statut: ${u.STATUT}`);
            console.log('---');
        });

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await db.close();
    }
}

getUsers();
