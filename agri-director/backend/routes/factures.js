const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/factures - Liste des factures
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const month = req.query.month || '';
        const year = req.query.year || '';
        const status = req.query.status || '';

        let whereClause = "WHERE 1=1";
        const binds = {};

        if (month) {
            whereClause += " AND EXTRACT(MONTH FROM f.created_at) = :month";
            binds.month = parseInt(month);
        }
        if (year) {
            whereClause += " AND EXTRACT(YEAR FROM f.created_at) = :year";
            binds.year = parseInt(year);
        }
        if (status) {
            whereClause += " AND UPPER(f.status) = UPPER(:status)";
            binds.status = status;
        }

        // Count total
        const countResult = await db.execute(
            `SELECT COUNT(*) as total FROM order_invoices f ${whereClause}`,
            binds
        );

        // Get factures with client info
        const result = await db.execute(`
            SELECT f.*, c.nom_client, c.prenom, c.entreprise, c.type_client, c.email
            FROM order_invoices f
            JOIN clients c ON f.client_id = c.id
            ${whereClause}
            ORDER BY f.created_at DESC
            OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `, { ...binds, offset, limit });

        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page,
                limit,
                total: countResult.rows[0].TOTAL || 0,
                pages: Math.ceil((countResult.rows[0].TOTAL || 0) / limit)
            }
        });
    } catch (err) {
        console.error('Erreur factures:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/factures/stats - Statistiques factures
router.get('/stats', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN UPPER(status) = 'PENDING' THEN 1 ELSE 0 END) as en_attente,
                SUM(CASE WHEN UPPER(status) = 'PAID' THEN 1 ELSE 0 END) as payees,
                SUM(CASE WHEN UPPER(status) = 'OVERDUE' THEN 1 ELSE 0 END) as en_retard,
                NVL(SUM(total_ttc), 0) as total_facture,
                NVL(SUM(CASE WHEN UPPER(status) = 'PAID' THEN total_ttc ELSE 0 END), 0) as total_encaisse,
                NVL(SUM(CASE WHEN UPPER(status) IN ('PENDING', 'OVERDUE') THEN total_ttc ELSE 0 END), 0) as total_impaye
            FROM order_invoices
        `);

        // Factures du mois en cours
        const currentMonthResult = await db.execute(`
            SELECT COUNT(*) as count, NVL(SUM(total_ttc), 0) as total
            FROM order_invoices 
            WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM SYSDATE)
        `);

        res.json({
            success: true,
            data: {
                global: result.rows[0],
                moisEnCours: currentMonthResult.rows[0]
            }
        });
    } catch (err) {
        console.error('Erreur stats factures:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/factures/:id - Détails d'une facture
router.get('/:id', async (req, res) => {
    try {
        const factureResult = await db.execute(`
            SELECT f.*, c.nom_client, c.prenom, c.entreprise, c.type_client, c.email, c.tel, c.adresse, c.ville
            FROM order_invoices f
            JOIN clients c ON f.client_id = c.id
            WHERE f.id = :id
        `, { id: req.params.id });

        if (factureResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Facture non trouvée' });
        }

        res.json({
            success: true,
            data: {
                facture: factureResult.rows[0]
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/factures/:id/status - Changer le statut d'une facture
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        await db.execute(`
            UPDATE order_invoices SET status = :status WHERE id = :id
        `, { status, id: req.params.id });

        res.json({ success: true, message: 'Statut mis à jour' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
