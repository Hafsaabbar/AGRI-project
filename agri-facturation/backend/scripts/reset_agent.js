const db = require('../config/database');

async function resetAgent() {
    try {
        await db.initialize();

        const email = 'agent@agri.ma';
        const password = '123456'; // Plain text as expected by server.js

        console.log(`Checking for user ${email}...`);

        // Check if exists
        const check = await db.execute(`SELECT id FROM utilisateurs WHERE email = :email`, { email });

        if (check.rows.length > 0) {
            console.log('User exists. Updating password...');
            await db.execute(`
                UPDATE utilisateurs 
                SET mot_de_passe = :password, role_id = 4, statut = 'ACTIF', nom = 'El Amrani', prenom = 'Nadia'
                WHERE email = :email
            `, { password, email });
        } else {
            console.log('User does not exist. Creating...');
            await db.execute(`
                INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role_id, statut, date_creation)
                VALUES ('El Amrani', 'Nadia', :email, :password, 4, 'ACTIF', SYSDATE)
            `, { email, password });
        }

        console.log('SUCCESS: Agent credentials set.');
        console.log('Email:', email);
        console.log('Password:', password);

        await db.execute('COMMIT'); // Ensure commit

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await db.close();
    }
}

resetAgent();
