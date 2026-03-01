const db = require('./config/database');

async function test() {
    try {
        console.log('Init DB...');
        await db.initialize();
        console.log('Connected. Querying user...');

        const email = 'compta@agri.com';
        const result = await db.execute(`
            SELECT id, email, nom, prenom, role_id, statut, mot_de_passe
            FROM utilisateurs
            WHERE email = :email
        `, { email });

        console.log('Rows found:', result.rows.length);
        if (result.rows.length > 0) {
            console.log('User 0:', JSON.stringify(result.rows[0]));
            console.log('PWD Access:', result.rows[0].MOT_DE_PASSE);
        }
        await db.close();
    } catch (e) {
        console.error('ERROR:', e);
    }
}

test();
