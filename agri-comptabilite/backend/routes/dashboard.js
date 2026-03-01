const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/dashboard/stats - Statistiques comptables
router.get('/stats', async (req, res) => {
    try {
        // Statistiques des factures (order_invoices)
        const facturesResult = await db.execute(`
            SELECT 
                COUNT(*) as total_factures,
                NVL(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) as en_attente,
                NVL(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END), 0) as payees,
                NVL(SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END), 0) as en_retard,
                NVL(SUM(total_ttc), 0) as total_facture,
                NVL(SUM(CASE WHEN status = 'PAID' THEN total_ttc ELSE 0 END), 0) as total_encaisse,
                NVL(SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_ttc ELSE 0 END), 0) as total_impaye
            FROM order_invoices
        `);

        // CA du mois en cours
        const caMoisResult = await db.execute(`
            SELECT 
                COUNT(*) as nb_factures,
                NVL(SUM(total_ht), 0) as ca_ht,
                NVL(SUM(total_tva), 0) as tva_collectee,
                NVL(SUM(total_ttc), 0) as ca_ttc
            FROM order_invoices 
            WHERE EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM SYSDATE)
        `);

        // Journal des ventes - écritures récentes
        const journalResult = await db.execute(`
            SELECT 
                COUNT(*) as nb_ecritures,
                NVL(SUM(montant_ttc), 0) as total_ecrit
            FROM journal_ventes
            WHERE date_ecriture >= TRUNC(SYSDATE, 'MM')
        `);

        // Clients avec impayés
        const impayesResult = await db.execute(`
            SELECT COUNT(DISTINCT client_id) as clients_impayes
            FROM order_invoices
            WHERE status IN ('PENDING', 'OVERDUE')
        `);

        // Top 5 dernières factures
        const dernieresFactures = await db.execute(`
            SELECT f.invoice_number, f.total_ttc, f.status, f.created_at,
                   c.nom_client, c.prenom
            FROM order_invoices f
            JOIN clients c ON f.client_id = c.id
            ORDER BY f.created_at DESC
            FETCH FIRST 5 ROWS ONLY
        `);

        res.json({
            success: true,
            data: {
                factures: facturesResult.rows[0],
                moisEnCours: caMoisResult.rows[0],
                journal: journalResult.rows[0],
                impayesCount: impayesResult.rows[0]?.CLIENTS_IMPAYES || 0,
                dernieresFactures: dernieresFactures.rows
            }
        });
    } catch (err) {
        console.error('Erreur dashboard stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dashboard/kpis - KPIs comptables
router.get('/kpis', async (req, res) => {
    try {
        // Taux de recouvrement
        const recouvrementResult = await db.execute(`
            SELECT 
                NVL(SUM(CASE WHEN status = 'PAID' THEN total_ttc ELSE 0 END), 0) as encaisse,
                NVL(SUM(total_ttc), 0) as total
            FROM order_invoices
        `);

        const tauxRecouvrement = recouvrementResult.rows[0].TOTAL > 0
            ? (recouvrementResult.rows[0].ENCAISSE / recouvrementResult.rows[0].TOTAL * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            data: {
                tauxRecouvrement: parseFloat(tauxRecouvrement)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
