const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/dashboard/stats - Statistiques globales pour le dashboard
router.get('/stats', async (req, res) => {
    try {
        // Statistiques factures (order_invoices)
        const facturesResult = await db.execute(`
            SELECT 
                COUNT(*) as total_factures,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as en_attente,
                SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as payees,
                SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) as en_retard,
                NVL(SUM(total_ttc), 0) as total_facture,
                NVL(SUM(CASE WHEN status = 'PAID' THEN total_ttc ELSE 0 END), 0) as total_encaisse,
                NVL(SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_ttc ELSE 0 END), 0) as total_impaye
            FROM order_invoices
        `);

        // CA du mois en cours
        const moisEnCoursResult = await db.execute(`
            SELECT 
                NVL(SUM(total_ttc), 0) as ca_ttc,
                NVL(SUM(total_ht), 0) as ca_ht,
                NVL(SUM(total_tva), 0) as tva_collectee,
                COUNT(*) as nb_factures
            FROM order_invoices 
            WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM SYSDATE)
        `);

        // Clients avec impayes
        const impayesResult = await db.execute(`
            SELECT COUNT(DISTINCT client_id) as nb_clients
            FROM order_invoices
            WHERE status IN ('PENDING', 'OVERDUE')
        `);

        // Bons de livraison du mois - Count
        const blCountResult = await db.execute(`
            SELECT COUNT(*) as nb_bl
            FROM delivery_notes dn
            WHERE EXTRACT(MONTH FROM dn.created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM dn.created_at) = EXTRACT(YEAR FROM SYSDATE)
        `);

        // Bons de livraison du mois - Total value
        const blTotalResult = await db.execute(`
            SELECT NVL(SUM(dni.quantity_delivered * p.prix_unitaire), 0) as total_bl
            FROM delivery_notes dn
            JOIN delivery_note_items dni ON dni.delivery_note_id = dn.id
            JOIN products p ON dni.product_id = p.product_id
            WHERE EXTRACT(MONTH FROM dn.created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM dn.created_at) = EXTRACT(YEAR FROM SYSDATE)
        `);

        // Commandes du mois
        const commandesResult = await db.execute(`
            SELECT COUNT(*) as nb_commandes,
                   NVL(SUM(total_ttc), 0) as total_commandes
            FROM orders
            WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM SYSDATE)
        `);

        // Dernieres factures
        const dernieresFacturesResult = await db.execute(`
            SELECT f.*, c.nom_client, c.prenom, c.type_client,
                   EXTRACT(MONTH FROM f.created_at) as month,
                   EXTRACT(YEAR FROM f.created_at) as year
            FROM order_invoices f
            JOIN clients c ON f.client_id = c.id
            ORDER BY f.created_at DESC
            FETCH FIRST 5 ROWS ONLY
        `);

        res.json({
            success: true,
            data: {
                factures: facturesResult.rows[0],
                moisEnCours: moisEnCoursResult.rows[0],
                impayesCount: impayesResult.rows[0]?.NB_CLIENTS || 0,
                bonsLivraison: {
                    NB_BL: blCountResult.rows[0]?.NB_BL || 0,
                    TOTAL_BL: blTotalResult.rows[0]?.TOTAL_BL || 0
                },
                commandes: commandesResult.rows[0],
                dernieresFactures: dernieresFacturesResult.rows
            }
        });
    } catch (err) {
        console.error('Erreur stats dashboard:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
