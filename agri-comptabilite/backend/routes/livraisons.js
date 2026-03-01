const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/livraisons - Liste des bons de livraison (lecture seule pour comptabilité)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const clientId = req.query.clientId || '';
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';
        const search = req.query.search || '';

        let whereClause = "WHERE 1=1";
        const binds = {};

        if (clientId) {
            whereClause += " AND dn.client_id = :clientId";
            binds.clientId = parseInt(clientId);
        }
        if (startDate) {
            whereClause += " AND dn.created_at >= TO_DATE(:startDate, 'YYYY-MM-DD')";
            binds.startDate = startDate;
        }
        if (endDate) {
            whereClause += " AND dn.created_at <= TO_DATE(:endDate, 'YYYY-MM-DD')";
            binds.endDate = endDate;
        }
        if (search) {
            whereClause += " AND (UPPER(c.nom_client) LIKE UPPER(:search) OR UPPER(dn.bl_number) LIKE UPPER(:search))";
            binds.search = `%${search}%`;
        }

        // Count
        const countResult = await db.execute(`
            SELECT COUNT(*) as total 
            FROM delivery_notes dn
            JOIN clients c ON dn.client_id = c.id
            ${whereClause}
        `, binds);

        // Get BL with totals
        const result = await db.execute(`
            SELECT dn.*, c.nom_client, c.prenom, c.entreprise, c.type_client,
                   o.order_number, o.total_ttc as order_total,
                   (SELECT NVL(SUM(dni.quantity_delivered * p.prix_unitaire), 0)
                    FROM delivery_note_items dni
                    JOIN products p ON dni.product_id = p.product_id
                    WHERE dni.delivery_note_id = dn.id) as total_bl
            FROM delivery_notes dn
            JOIN clients c ON dn.client_id = c.id
            JOIN orders o ON dn.order_id = o.id
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
        console.error('Erreur liste BL:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/livraisons/stats - Statistiques des BL
router.get('/stats', async (req, res) => {
    try {
        const month = req.query.month || new Date().getMonth() + 1;
        const year = req.query.year || new Date().getFullYear();

        const result = await db.execute(`
            SELECT 
                COUNT(*) as total_bl,
                COUNT(DISTINCT client_id) as nb_clients,
                (SELECT NVL(SUM(dni.quantity_delivered * p.prix_unitaire), 0)
                 FROM delivery_notes dn2
                 JOIN delivery_note_items dni ON dni.delivery_note_id = dn2.id
                 JOIN products p ON dni.product_id = p.product_id
                 WHERE EXTRACT(MONTH FROM dn2.created_at) = :month
                 AND EXTRACT(YEAR FROM dn2.created_at) = :year) as total_valeur
            FROM delivery_notes dn
            WHERE EXTRACT(MONTH FROM dn.created_at) = :month
            AND EXTRACT(YEAR FROM dn.created_at) = :year
        `, { month: parseInt(month), year: parseInt(year) });

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/livraisons/:id - Détails d'un BL
router.get('/:id', async (req, res) => {
    try {
        const blResult = await db.execute(`
            SELECT dn.*, c.nom_client, c.prenom, c.entreprise, c.type_client, c.email, c.tel, c.adresse, c.ville,
                   o.order_number
            FROM delivery_notes dn
            JOIN clients c ON dn.client_id = c.id
            JOIN orders o ON dn.order_id = o.id
            WHERE dn.id = :id
        `, { id: req.params.id });

        if (blResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Bon de livraison non trouvé' });
        }

        // Détails des produits
        const itemsResult = await db.execute(`
            SELECT dni.*, p.product_name, p.product_code, p.prix_unitaire,
                   (dni.quantity_delivered * p.prix_unitaire) as total_ligne
            FROM delivery_note_items dni
            JOIN products p ON dni.product_id = p.product_id
            WHERE dni.delivery_note_id = :id
            ORDER BY p.product_name
        `, { id: req.params.id });

        res.json({
            success: true,
            data: {
                bonLivraison: blResult.rows[0],
                items: itemsResult.rows
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/livraisons/client/:clientId - BL par client
router.get('/client/:clientId', async (req, res) => {
    try {
        const month = req.query.month;
        const year = req.query.year;

        let whereClause = "WHERE dn.client_id = :clientId";
        const binds = { clientId: req.params.clientId };

        if (month && year) {
            whereClause += " AND EXTRACT(MONTH FROM dn.created_at) = :month AND EXTRACT(YEAR FROM dn.created_at) = :year";
            binds.month = parseInt(month);
            binds.year = parseInt(year);
        }

        const result = await db.execute(`
            SELECT dn.*, 
                   (SELECT NVL(SUM(dni.quantity_delivered * p.prix_unitaire), 0)
                    FROM delivery_note_items dni
                    JOIN products p ON dni.product_id = p.product_id
                    WHERE dni.delivery_note_id = dn.id) as total_bl
            FROM delivery_notes dn
            ${whereClause}
            ORDER BY dn.created_at DESC
        `, binds);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
