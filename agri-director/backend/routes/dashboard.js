const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/dashboard/stats - Statistiques globales
router.get('/stats', async (req, res) => {
    try {
        // Total clients (exclude ADMIN users)
        const clientsResult = await db.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN UPPER(type_client) = 'PROFESSIONNEL' THEN 1 ELSE 0 END) as detaillants,
                SUM(CASE WHEN UPPER(type_client) = 'PARTICULIER' THEN 1 ELSE 0 END) as particuliers,
                SUM(CASE WHEN UPPER(type_client) = 'AGRICULTEUR' THEN 1 ELSE 0 END) as agriculteurs
            FROM clients WHERE UPPER(role) != 'ADMIN' OR role IS NULL
        `);

        // Total produits (all active)
        const produitsResult = await db.execute(`
            SELECT COUNT(*) as total FROM products WHERE UPPER(is_active) = 'Y' OR is_active IS NULL
        `);

        // Total commandes ce mois
        const commandesResult = await db.execute(`
            SELECT 
                COUNT(*) as total,
                NVL(SUM(total_ttc), 0) as chiffre_affaires
            FROM orders 
            WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM SYSDATE)
        `);

        // Commandes en attente
        const pendingResult = await db.execute(`
            SELECT COUNT(*) as total FROM orders WHERE UPPER(status) = 'PENDING'
        `);

        // Total agences actives
        const agencesResult = await db.execute(`
            SELECT COUNT(*) as total FROM agences WHERE UPPER(statut) = 'ACTIF'
        `);

        // Factures impayées
        const facturesResult = await db.execute(`
            SELECT COUNT(*) as total, NVL(SUM(total_ttc), 0) as montant
            FROM order_invoices WHERE UPPER(status) IN ('PENDING', 'OVERDUE')
        `);

        // Format response with explicit named properties
        const clientRow = clientsResult.rows[0] || {};
        const commandesRow = commandesResult.rows[0] || {};
        const facturesRow = facturesResult.rows[0] || {};

        res.json({
            success: true,
            data: {
                clients: {
                    TOTAL: clientRow.TOTAL || 0,
                    DETAILLANTS: clientRow.DETAILLANTS || 0,
                    PARTICULIERS: clientRow.PARTICULIERS || 0,
                    AGRICULTEURS: clientRow.AGRICULTEURS || 0
                },
                produits: (produitsResult.rows[0] || {}).TOTAL || 0,
                commandes: {
                    TOTAL: commandesRow.TOTAL || 0,
                    CHIFFRE_AFFAIRES: commandesRow.CHIFFRE_AFFAIRES || 0
                },
                commandesPending: (pendingResult.rows[0] || {}).TOTAL || 0,
                agences: (agencesResult.rows[0] || {}).TOTAL || 0,
                facturesImpayees: {
                    TOTAL: facturesRow.TOTAL || 0,
                    MONTANT: facturesRow.MONTANT || 0
                }
            }
        });
    } catch (err) {
        console.error('Erreur stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dashboard/sales-chart - Données pour graphique ventes (12 mois)
router.get('/sales-chart', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT 
                TO_CHAR(created_at, 'YYYY-MM') as mois,
                COUNT(*) as nb_commandes,
                NVL(SUM(total_ttc), 0) as total_ventes
            FROM orders
            WHERE created_at >= ADD_MONTHS(SYSDATE, -12)
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY mois
        `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dashboard/top-products - Top 10 produits vendus
router.get('/top-products', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT 
                p.product_name,
                p.category,
                SUM(oi.quantity) as total_vendu,
                SUM(oi.total_line) as total_ca
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            GROUP BY p.product_name, p.category
            ORDER BY total_vendu DESC
            FETCH FIRST 10 ROWS ONLY
        `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dashboard/recent-orders - 5 dernières commandes
router.get('/recent-orders', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT 
                o.id, o.order_number, o.total_ttc, o.status, o.created_at,
                c.nom_client, c.prenom, c.type_client
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            ORDER BY o.created_at DESC
            FETCH FIRST 5 ROWS ONLY
        `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;