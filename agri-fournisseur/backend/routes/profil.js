const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/profil - Récupérer le profil du fournisseur
router.get('/', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];

        if (!fournisseurId) {
            return res.status(401).json({ success: false, error: 'Non authentifié' });
        }

        // Utiliser uniquement les colonnes qui existent dans la table
        const result = await db.execute(`
            SELECT id, email, nom, prenom, role, status, type_fournisseur,
                   telephone, adresse, raison_sociale, code_fournisseur,
                   ville, code_postal, ice, rc, telephone_mobile,
                   delai_livraison, created_at, updated_at
            FROM fournisseurs
            WHERE id = :id
        `, { id: fournisseurId });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fournisseur non trouvé' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/profil - Mettre à jour le profil
router.put('/', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];
        const body = req.body;

        // Récupérer les valeurs actuelles
        const existing = await db.execute(`
            SELECT * FROM fournisseurs WHERE id = :id
        `, { id: fournisseurId });

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fournisseur non trouvé' });
        }

        const current = existing.rows[0];

        // Fusionner les valeurs (colonnes existantes seulement)
        const nom = body.nom || current.NOM;
        const prenom = body.prenom !== undefined ? body.prenom : current.PRENOM;
        const telephone = body.telephone !== undefined ? body.telephone : current.TELEPHONE;
        const telephone_mobile = body.telephone_mobile !== undefined ? body.telephone_mobile : current.TELEPHONE_MOBILE;
        const adresse = body.adresse !== undefined ? body.adresse : current.ADRESSE;
        const ville = body.ville !== undefined ? body.ville : current.VILLE;
        const code_postal = body.code_postal !== undefined ? body.code_postal : current.CODE_POSTAL;
        const raison_sociale = body.raison_sociale !== undefined ? body.raison_sociale : current.RAISON_SOCIALE;
        const ice = body.ice !== undefined ? body.ice : current.ICE;
        const rc = body.rc !== undefined ? body.rc : current.RC;
        const delai_livraison = body.delai_livraison !== undefined ? body.delai_livraison : current.DELAI_LIVRAISON;

        await db.execute(`
            UPDATE fournisseurs SET
                nom = :nom,
                prenom = :prenom,
                telephone = :telephone,
                telephone_mobile = :telephone_mobile,
                adresse = :adresse,
                ville = :ville,
                code_postal = :code_postal,
                raison_sociale = :raison_sociale,
                ice = :ice,
                rc = :rc,
                delai_livraison = :delai_livraison,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        `, {
            nom,
            prenom,
            telephone,
            telephone_mobile,
            adresse,
            ville,
            code_postal,
            raison_sociale,
            ice,
            rc,
            delai_livraison,
            id: fournisseurId
        });

        res.json({ success: true, message: 'Profil mis à jour avec succès' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/profil/password - Changer le mot de passe
router.put('/password', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ success: false, error: 'Mot de passe actuel et nouveau requis' });
        }

        // Vérifier le mot de passe actuel
        const result = await db.execute(`
            SELECT password FROM fournisseurs WHERE id = :id
        `, { id: fournisseurId });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fournisseur non trouvé' });
        }

        const dbPassword = result.rows[0].PASSWORD;
        if (dbPassword.trim() !== current_password.trim()) {
            return res.status(401).json({ success: false, error: 'Mot de passe actuel incorrect' });
        }

        // Mettre à jour le mot de passe
        await db.execute(`
            UPDATE fournisseurs SET
                password = :new_password,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :id
        `, { new_password, id: fournisseurId });

        res.json({ success: true, message: 'Mot de passe changé avec succès' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
