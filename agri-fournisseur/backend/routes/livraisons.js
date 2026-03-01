const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/livraisons - Liste des livraisons concernant les produits du fournisseur
router.get('/', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';

        let whereClause = 'WHERE p.fournisseur_id = :fournisseurId';
        let binds = { fournisseurId };

        if (status) {
            whereClause += ' AND dn.delivery_status = :status';
            binds.status = status;
        }

        // Compte total
        const countResult = await db.execute(`
            SELECT COUNT(DISTINCT dn.id) as total 
            FROM delivery_notes dn
            JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
            JOIN products p ON dni.product_id = p.product_id
            ${whereClause}
        `, binds);

        // Liste des livraisons
        const result = await db.execute(`
            SELECT DISTINCT dn.id, dn.bl_number, dn.order_id, dn.client_id, dn.delivery_date,
                   dn.delivery_status, dn.notes, dn.created_at,
                   c.nom_client, c.prenom, c.ville, c.adresse,
                   o.order_number, o.total_ttc
            FROM delivery_notes dn
            JOIN clients c ON dn.client_id = c.id
            JOIN orders o ON dn.order_id = o.id
            JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
            JOIN products p ON dni.product_id = p.product_id
            ${whereClause}
            ORDER BY dn.created_at DESC
            OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `, { ...binds, offset, limit });

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page,
                limit,
                total: countResult.rows[0].TOTAL,
                pages: Math.ceil(countResult.rows[0].TOTAL / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/livraisons/:id - Détail d'une livraison
router.get('/:id', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];

        // Infos de la livraison
        const blResult = await db.execute(`
            SELECT dn.*, c.nom_client, c.prenom, c.email, c.tel, c.adresse, c.ville,
                   o.order_number, o.total_ht, o.total_tva, o.total_ttc
            FROM delivery_notes dn
            JOIN clients c ON dn.client_id = c.id
            JOIN orders o ON dn.order_id = o.id
            WHERE dn.id = :id
        `, { id: req.params.id });

        if (blResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Bon de livraison non trouvé' });
        }

        // Items de la livraison (uniquement ceux du fournisseur)
        const itemsResult = await db.execute(`
            SELECT dni.*, p.product_code, p.product_name, p.category, p.unit, p.prix_unitaire
            FROM delivery_note_items dni
            JOIN products p ON dni.product_id = p.product_id
            WHERE dni.delivery_note_id = :id AND p.fournisseur_id = :fournisseurId
        `, { id: req.params.id, fournisseurId });

        res.json({
            success: true,
            data: {
                ...blResult.rows[0],
                items: itemsResult.rows
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/livraisons/stats/summary - Statistiques des livraisons
router.get('/stats/summary', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];

        // Livraisons par statut
        const statusResult = await db.execute(`
            SELECT dn.delivery_status, COUNT(DISTINCT dn.id) as count
            FROM delivery_notes dn
            JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
            JOIN products p ON dni.product_id = p.product_id
            WHERE p.fournisseur_id = :fournisseurId
            GROUP BY dn.delivery_status
        `, { fournisseurId });

        // Livraisons des 30 derniers jours
        const recentResult = await db.execute(`
            SELECT COUNT(DISTINCT dn.id) as total
            FROM delivery_notes dn
            JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
            JOIN products p ON dni.product_id = p.product_id
            WHERE p.fournisseur_id = :fournisseurId
            AND dn.created_at >= SYSDATE - 30
        `, { fournisseurId });

        res.json({
            success: true,
            data: {
                by_status: statusResult.rows,
                last_30_days: recentResult.rows[0]?.TOTAL || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
