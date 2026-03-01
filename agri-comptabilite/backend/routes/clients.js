const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/clients - Liste des clients
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const type = req.query.type || '';
        const search = req.query.search || '';

        let whereClause = "WHERE 1=1";
        const binds = {};

        if (type) {
            whereClause += " AND type_client = :type";
            binds.type = type;
        }
        if (search) {
            whereClause += " AND (UPPER(nom_client) LIKE UPPER(:search) OR UPPER(email) LIKE UPPER(:search) OR UPPER(entreprise) LIKE UPPER(:search))";
            binds.search = `%${search}%`;
        }

        const countResult = await db.execute(`SELECT COUNT(*) as total FROM clients ${whereClause}`, binds);

        const result = await db.execute(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM monthly_invoices mi WHERE mi.client_id = c.id) as nb_factures,
                   (SELECT NVL(SUM(total_ttc), 0) FROM monthly_invoices mi WHERE mi.client_id = c.id AND mi.status = 'PAID') as total_paye,
                   (SELECT NVL(SUM(total_ttc), 0) FROM monthly_invoices mi WHERE mi.client_id = c.id AND mi.status IN ('PENDING', 'OVERDUE')) as total_impaye
            FROM clients c
            ${whereClause}
            ORDER BY c.nom_client
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
        console.error('Erreur liste clients:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/clients/stats - Statistiques clients
router.get('/stats', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT 
                COUNT(*) as total_clients,
                SUM(CASE WHEN type_client = 'PARTICULIER' THEN 1 ELSE 0 END) as particuliers,
                SUM(CASE WHEN type_client = 'PROFESSIONNEL' THEN 1 ELSE 0 END) as professionnels,
                SUM(CASE WHEN type_client = 'AGRICULTEUR' THEN 1 ELSE 0 END) as agriculteurs
            FROM clients
            WHERE role = 'CLIENT'
        `);

        // Clients avec impayés
        const impayesResult = await db.execute(`
            SELECT COUNT(DISTINCT client_id) as clients_impayes,
                   NVL(SUM(total_ttc), 0) as montant_impayes
            FROM monthly_invoices
            WHERE status IN ('PENDING', 'OVERDUE')
        `);

        res.json({
            success: true,
            data: {
                repartition: result.rows[0],
                impayes: impayesResult.rows[0]
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/clients/:id - Détails d'un client
router.get('/:id', async (req, res) => {
    try {
        const clientResult = await db.execute(`
            SELECT * FROM clients WHERE id = :id
        `, { id: req.params.id });

        if (clientResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client non trouvé' });
        }

        // Historique des factures
        const facturesResult = await db.execute(`
            SELECT * FROM monthly_invoices 
            WHERE client_id = :id
            ORDER BY year DESC, month DESC
        `, { id: req.params.id });

        // Statistiques client
        const statsResult = await db.execute(`
            SELECT 
                COUNT(*) as nb_factures,
                NVL(SUM(total_ttc), 0) as total_facture,
                NVL(SUM(CASE WHEN status = 'PAID' THEN total_ttc ELSE 0 END), 0) as total_paye,
                NVL(SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_ttc ELSE 0 END), 0) as total_impaye
            FROM monthly_invoices
            WHERE client_id = :id
        `, { id: req.params.id });

        res.json({
            success: true,
            data: {
                client: clientResult.rows[0],
                factures: facturesResult.rows,
                stats: statsResult.rows[0]
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/clients/:id/impayes - Factures impayées d'un client
router.get('/:id/impayes', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT * FROM monthly_invoices 
            WHERE client_id = :id AND status IN ('PENDING', 'OVERDUE')
            ORDER BY year DESC, month DESC
        `, { id: req.params.id });

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
