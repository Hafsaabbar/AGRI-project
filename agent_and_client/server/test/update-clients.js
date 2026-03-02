const db = require('../config/db');
const oracledb = require('oracledb');

const realisticClients = [
    {
        nom: 'Bennani',
        prenom: 'Karim',
        entreprise: 'Ferme Bennani',
        email_pattern: 'karim.bennani',
        tel: '0661123456',
        ville: 'Meknès',
        adresse: 'Route de Fès, Km 12',
        code_postal: '50000',
        type_client: 'AGRICULTEUR'
    },
    {
        nom: 'Alami',
        prenom: 'Sarah',
        entreprise: 'Bio Marché',
        email_pattern: 'sarah.alami',
        tel: '0663987654',
        ville: 'Casablanca',
        adresse: 'Bd Anfa, Résidence Les Fleurs',
        code_postal: '20000',
        type_client: 'PROFESSIONNEL'
    },
    {
        nom: 'Tazi',
        prenom: 'Omar',
        entreprise: null,
        email_pattern: 'omar.tazi',
        tel: '0655112233',
        ville: 'Rabat',
        adresse: 'Hay Riad, Secteur 4',
        code_postal: '10100',
        type_client: 'PARTICULIER'
    },
    {
        nom: 'El Fassi',
        prenom: 'Meryem',
        entreprise: 'Coopérative El Fassi',
        email_pattern: 'meryem',
        tel: '0677445566',
        ville: 'Agadir',
        adresse: 'Zone Industrielle Tassila',
        code_postal: '80000',
        type_client: 'AGRICULTEUR'
    },
    {
        nom: 'Ouazzani',
        prenom: 'Youssef',
        entreprise: 'Restaurant Le Jardin',
        email_pattern: 'youssef',
        tel: '0661223344',
        ville: 'Marrakech',
        adresse: 'Gueliz, Rue de la Liberté',
        code_postal: '40000',
        type_client: 'PROFESSIONNEL'
    }
];

async function updateClients() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();

        // Fetch all clients
        const result = await connection.execute(
            `SELECT id, email FROM clients ORDER BY id`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const clients = result.rows;
        console.log(`Found ${clients.length} clients to update.`);

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
            WHERE id = :id
        `;

        for (let i = 0; i < clients.length; i++) {
            // Cycle through realistic personas
            const data = realisticClients[i % realisticClients.length];
            const client = clients[i];

            await connection.execute(updateSql, {
                nom: data.nom,
                prenom: data.prenom,
                entreprise: data.entreprise,
                tel: data.tel,
                ville: data.ville,
                adresse: data.adresse,
                code_postal: data.code_postal,
                type_client: data.type_client,
                id: client.ID
            }, { autoCommit: false });

            console.log(`Updated client ID ${client.ID} to ${data.prenom} ${data.nom}`);
        }

        await connection.commit();
        console.log('✅ All clients updated with realistic data.');

        await connection.close();
        await db.close();
    } catch (err) {
        console.error(err);
    }
}

updateClients();
