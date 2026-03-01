const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/commandes - Liste des commandes (bons de commande)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';
        const search = req.query.search || '';

        let whereClause = "WHERE 1=1";
        const binds = {};

        if (status) {
            whereClause += " AND o.status = :status";
            binds.status = status;
        }
        if (search) {
            whereClause += " AND (UPPER(c.nom_client) LIKE UPPER(:search) OR UPPER(o.order_number) LIKE UPPER(:search))";
            binds.search = `%${search}%`;
        }

        // Count
        const countResult = await db.execute(`
            SELECT COUNT(*) as total 
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            ${whereClause}
        `, binds);

        // Get orders with client info
        const result = await db.execute(`
            SELECT o.*, c.nom_client, c.prenom, c.entreprise, c.type_client, c.email, c.tel,
                   (SELECT nom FROM agences WHERE id = o.approved_by) as agence_nom
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            ${whereClause}
            ORDER BY o.created_at DESC
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
        console.error('Erreur liste commandes:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/commandes/stats - Statistiques des commandes
router.get('/stats', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT 
                COUNT(*) as total_commandes,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as en_attente,
                SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approuvees,
                SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as livrees,
                NVL(SUM(total_ttc), 0) as total_valeur
            FROM orders
        `);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/commandes/:id - Details d'une commande
router.get('/:id', async (req, res) => {
    try {
        const commandeResult = await db.execute(`
            SELECT o.*, c.nom_client, c.prenom, c.entreprise, c.type_client, c.email, c.tel, c.adresse, c.ville
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            WHERE o.id = :id
        `, { id: req.params.id });

        if (commandeResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Commande non trouvee' });
        }

        // Details des produits
        const itemsResult = await db.execute(`
            SELECT oi.*, p.product_name, p.product_code
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = :id
            ORDER BY p.product_name
        `, { id: req.params.id });

        res.json({
            success: true,
            data: {
                commande: commandeResult.rows[0],
                items: itemsResult.rows
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
