const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');
const config = require('./config/config');

// Import routes
const dashboardRoutes = require('./routes/dashboard');
const facturesRoutes = require('./routes/factures');
const journalRoutes = require('./routes/journal');
const livraisonsRoutes = require('./routes/livraisons');
const clientsRoutes = require('./routes/clients');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = config.port || 3004;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes API
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/factures', facturesRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/livraisons', livraisonsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/reports', reportsRoutes);

// Route d'authentification comptable (utilise table UTILISATEURS)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Vérifier dans table UTILISATEURS avec ROLE_ID pour comptable
        const result = await db.execute(`
            SELECT id, email, nom, prenom, role_id, statut, mot_de_passe
            FROM utilisateurs
            WHERE email = :email
        `, { email });

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Identifiants invalides' });
        }

        const user = result.rows[0];
        const dbPassword = user.MOT_DE_PASSE;
        const roleId = user.ROLE_ID;

        // Le role_id doit correspondre à COMPTABLE (supposons 3 ou vérifier)
        console.log('--- LOGIN COMPTABLE DEBUG ---');
        console.log('Email:', email);
        console.log('Role ID:', roleId);

        // Comparaison mot de passe
        const match = dbPassword && password && (dbPassword.trim() === password.trim());

        if (!match) {
            return res.status(401).json({ success: false, error: 'Mot de passe incorrect' });
        }

        if (user.STATUT !== 'ACTIF') {
            return res.status(401).json({ success: false, error: 'Compte inactif' });
        }

        res.json({
            success: true,
            user: {
                id: user.ID,
                email: user.EMAIL,
                nom: user.NOM,
                prenom: user.PRENOM,
                roleId: user.ROLE_ID
            }
        });
    } catch (err) {
        console.error('Erreur login:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Route pour créer un compte comptable
app.post('/api/auth/create-comptable', async (req, res) => {
    try {
        const { email, password, nom, prenom, telephone } = req.body;
        const oracledb = require('oracledb');

        // Vérifier si email existe déjà
        const existCheck = await db.execute(`
            SELECT COUNT(*) as count FROM utilisateurs WHERE email = :email
        `, { email });

        if (existCheck.rows[0].COUNT > 0) {
            return res.status(400).json({ success: false, error: 'Email déjà utilisé' });
        }

        // Créer le comptable (ROLE_ID = 3 pour COMPTABLE, à adapter selon votre table roles)
        const result = await db.execute(`
            INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, telephone, role_id, statut, date_creation)
            VALUES (:nom, :prenom, :email, :password, :telephone, 3, 'ACTIF', SYSDATE)
            RETURNING id INTO :id
        `, {
            nom,
            prenom,
            email,
            password,
            telephone: telephone || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        });

        res.json({
            success: true,
            message: 'Compte comptable créé avec succès',
            userId: result.outBinds.id[0]
        });
    } catch (err) {
        console.error('Erreur création comptable:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Route de vérification de session
app.get('/api/auth/me', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Non authentifié' });
    }

    try {
        const result = await db.execute(`
            SELECT id, email, nom, prenom, role_id
            FROM utilisateurs WHERE id = :id
        `, { id: userId });

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Utilisateur non trouvé' });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Route principale - rediriger vers le frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
});

// Démarrage du serveur
async function startServer() {
    app.listen(PORT, () => {
        console.log(`🧾 Serveur AGRI Comptabilité démarré sur http://localhost:${PORT}`);
        console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
    });

    try {
        console.log('Connexion à Oracle Cloud...');
        await db.initialize();
        console.log('✅ Connexion Oracle Cloud établie');
        await db.testConnection();
    } catch (err) {
        console.error('❌ Erreur de connexion base de données:', err);
    }
}

// Gestion de la fermeture propre
process.on('SIGINT', async () => {
    console.log('\nFermeture du serveur...');
    await db.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nArrêt du serveur...');
    await db.close();
    process.exit(0);
});

startServer();
