const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/agences - Liste des agences
router.get('/', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT a.*, c.nom_client as responsable_nom, c.prenom as responsable_prenom
            FROM agences a
            LEFT JOIN clients c ON a.responsable_id = c.id
            ORDER BY a.nom
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/agences/:id - Détails d'une agence
router.get('/:id', async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT a.*, c.nom_client as responsable_nom, c.prenom as responsable_prenom
             FROM agences a
             LEFT JOIN clients c ON a.responsable_id = c.id
             WHERE a.id = :id`,
            { id: req.params.id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Agence non trouvée' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/agences - Ajouter une agence
router.post('/', async (req, res) => {
    try {
        const { nom, ville, region, adresse, telephone, email, responsable_id, statut } = req.body;

        const result = await db.execute(`
            INSERT INTO agences (nom, ville, region, adresse, telephone, email, responsable_id, statut, date_creation)
            VALUES (:nom, :ville, :region, :adresse, :telephone, :email, :responsable_id, :statut, SYSDATE)
            RETURNING id INTO :id
        `, {
            nom,
            ville: ville || 'Casablanca',
            region: region || 'Casablanca-Settat',
            adresse: adresse || null,
            telephone: telephone || null,
            email: email || null,
            responsable_id: responsable_id || null,
            statut: statut || 'ACTIF',
            id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER }
        });

        res.json({
            success: true,
            message: 'Agence ajoutée avec succès',
            agenceId: result.outBinds.id[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/agences/:id - Modifier une agence
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Récupérer l'agence existante
        const existing = await db.execute(
            `SELECT * FROM agences WHERE id = :id`,
            { id }
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Agence non trouvée' });
        }

        const current = existing.rows[0];
        const body = req.body;

        // Fusionner avec les valeurs existantes
        const nom = body.nom || current.NOM;
        const ville = body.ville || current.VILLE || 'Casablanca';
        const region = body.region || current.REGION;
        const adresse = body.adresse !== undefined ? body.adresse : current.ADRESSE;
        const telephone = body.telephone !== undefined ? body.telephone : current.TELEPHONE;
        const email = body.email !== undefined ? body.email : current.EMAIL;
        const responsable_id = body.responsable_id !== undefined ? body.responsable_id : current.RESPONSABLE_ID;
        const statut = body.statut || current.STATUT || 'ACTIF';

        // Validation
        if (!nom) {
            return res.status(400).json({ success: false, error: 'Le nom de l\'agence est requis' });
        }

        await db.execute(`
            UPDATE agences SET
                nom = :nom,
                ville = :ville,
                region = :region,
                adresse = :adresse,
                telephone = :telephone,
                email = :email,
                responsable_id = :responsable_id,
                statut = :statut
            WHERE id = :id
        `, {
            nom,
            ville,
            region,
            adresse,
            telephone,
            email,
            responsable_id,
            statut,
            id
        });

        res.json({ success: true, message: 'Agence mise à jour avec succès' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/agences/:id - Supprimer (désactiver) une agence
router.delete('/:id', async (req, res) => {
    try {
        await db.execute(
            `UPDATE agences SET statut = 'INACTIF' WHERE id = :id`,
            { id: req.params.id }
        );
        res.json({ success: true, message: 'Agence désactivée avec succès' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/agences/:id/stock - Stock par agence
router.get('/:id/stock', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT p.product_id, p.product_code, p.product_name, p.category, 
                   p.stock_disponible, p.stock_minimum, p.prix_unitaire
            FROM products p
            WHERE p.agence_id = :id AND p.is_active = 'Y'
            ORDER BY p.category, p.product_name
        `, { id: req.params.id });

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/agences/stats/summary - Statistiques globales des agences
router.get('/stats/summary', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT 
                a.id, a.nom,
                (SELECT COUNT(*) FROM orders o WHERE o.id IN (
                    SELECT DISTINCT dn.order_id FROM delivery_notes dn WHERE dn.created_by = a.responsable_id
                )) as nb_commandes,
                (SELECT NVL(SUM(o.total_ttc), 0) FROM orders o WHERE o.id IN (
                    SELECT DISTINCT dn.order_id FROM delivery_notes dn WHERE dn.created_by = a.responsable_id
                )) as ca_total
            FROM agences a
            WHERE a.statut = 'ACTIF'
        `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
