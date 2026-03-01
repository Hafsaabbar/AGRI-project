const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');
const oracledb = require('oracledb');

// Import routes
const dashboardRoutes = require('./routes/dashboard');
const produitsRoutes = require('./routes/produits');
const livraisonsRoutes = require('./routes/livraisons');
const profilRoutes = require('./routes/profil');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes API
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/produits', produitsRoutes);
app.use('/api/livraisons', livraisonsRoutes);
app.use('/api/profil', profilRoutes);

// =====================================================
// AUTHENTIFICATION
// =====================================================

// POST /api/auth/login - Connexion fournisseur
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
        }

        const result = await db.execute(`
            SELECT id, email, nom, prenom, role, status, password, type_fournisseur,
                   raison_sociale, telephone, adresse, ville
            FROM fournisseurs
            WHERE email = :email
        `, { email });

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Email non trouvé' });
        }

        const user = result.rows[0];
        const dbPassword = user.PASSWORD;

        // Vérifier le mot de passe
        if (!dbPassword || dbPassword.trim() !== password.trim()) {
            return res.status(401).json({ success: false, error: 'Mot de passe incorrect' });
        }

        // Vérifier le statut
        if (user.STATUS === 'INACTIF' || user.STATUS === 'SUSPENDU') {
            return res.status(403).json({ success: false, error: 'Compte inactif ou suspendu' });
        }

        res.json({
            success: true,
            message: 'Connexion réussie',
            user: {
                id: user.ID,
                email: user.EMAIL,
                nom: user.NOM,
                prenom: user.PRENOM,
                role: user.ROLE,
                type_fournisseur: user.TYPE_FOURNISSEUR,
                raison_sociale: user.RAISON_SOCIALE,
                telephone: user.TELEPHONE,
                adresse: user.ADRESSE,
                ville: user.VILLE
            }
        });
    } catch (err) {
        console.error('Erreur login:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/auth/register - Inscription fournisseur
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, nom, prenom, type_fournisseur, telephone, adresse, raison_sociale, ville } = req.body;

        if (!email || !password || !nom) {
            return res.status(400).json({ success: false, error: 'Email, mot de passe et nom requis' });
        }

        // Vérifier si l'email existe déjà
        const existingResult = await db.execute(`
            SELECT id FROM fournisseurs WHERE email = :email
        `, { email });

        if (existingResult.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Cet email est déjà utilisé' });
        }

        // Créer le fournisseur - colonnes de base sans contraintes CHECK
        const result = await db.execute(`
            INSERT INTO fournisseurs (email, password, nom, prenom, type_fournisseur, telephone, adresse)
            VALUES (:email, :password, :nom, :prenom, :type_fournisseur, :telephone, :adresse)
            RETURNING id INTO :id
        `, {
            email,
            password,
            nom,
            prenom: prenom || null,
            type_fournisseur: type_fournisseur || 'agriculteur',
            telephone: telephone || null,
            adresse: adresse || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        });

        res.json({
            success: true,
            message: 'Inscription réussie',
            userId: result.outBinds.id[0]
        });
    } catch (err) {
        console.error('Erreur inscription:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/auth/me - Vérifier la session
app.get('/api/auth/me', async (req, res) => {
    const userId = req.headers['x-fournisseur-id'];
    if (!userId) {
        return res.status(401).json({ success: false, error: 'Non authentifié' });
    }

    try {
        const result = await db.execute(`
            SELECT id, email, nom, prenom, role, type_fournisseur, raison_sociale
            FROM fournisseurs WHERE id = :id
        `, { id: userId });

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Utilisateur non trouvé' });
        }

        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// =====================================================
// ROUTES STATIQUES
// =====================================================

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Toutes les autres routes renvoient vers index.html (SPA)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur' });
});

// =====================================================
// DÉMARRAGE DU SERVEUR
// =====================================================

async function startServer() {
    app.listen(PORT, () => {
        console.log(`🌿 Serveur AGRI Fournisseur démarré sur http://localhost:${PORT}`);
        console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
    });

    try {
        console.log('Connexion à Oracle Cloud...');
        await db.initialize();
        console.log('✅ Connexion Oracle Cloud établie');

        try {
            const connected = await db.testConnection();
            if (!connected) {
                console.warn('⚠️ La connexion Oracle semble instable');
            }
        } catch (testErr) {
            console.error('⚠️ Erreur test connexion:', testErr.message);
        }
    } catch (err) {
        console.error('❌ Erreur connexion base de données:', err.message);
    }
}

// Gestion de la fermeture
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
