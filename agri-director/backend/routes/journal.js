const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/journal - Liste des écritures du journal des ventes
router.get('/', async (req, res) => {
    try {
        let page = parseInt(req.query.page);
        if (isNaN(page) || page < 1) page = 1;

        let limit = parseInt(req.query.limit);
        if (isNaN(limit) || limit < 1) limit = 50;

        const offset = (page - 1) * limit;
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';

        let whereClause = "WHERE 1=1";
        const binds = {};

        if (startDate) {
            whereClause += " AND j.date_ecriture >= TO_DATE(:startDate, 'YYYY-MM-DD')";
            binds.startDate = startDate;
        }
        if (endDate) {
            whereClause += " AND j.date_ecriture <= TO_DATE(:endDate, 'YYYY-MM-DD')";
            binds.endDate = endDate;
        }

        // Count total
        const countResult = await db.execute(
            `SELECT COUNT(*) as total FROM journal_ventes j ${whereClause}`,
            binds
        );

        const totalRecords = countResult.rows[0].TOTAL || 0;

        // Get écritures - try standard OFFSET pagination first
        let result = await db.execute(`
            SELECT j.*
            FROM journal_ventes j
            ${whereClause}
            ORDER BY j.date_ecriture DESC, j.id DESC
            OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `, { ...binds, offset, limit });

        // FALLBACK: If page 1 has 0 results but we know there are records, try ROWNUM approach
        // (Fixes issues on some Oracle versions or specific view contexts)
        if (result.rows.length === 0 && totalRecords > 0 && page === 1) {
            console.warn('Journal: OFFSET query returned 0 rows but count > 0. Using fallback ROWNUM query.');

            // Re-bind without offset for ROWNUM query
            const fallbackBinds = { ...binds, limit };

            result = await db.execute(`
                SELECT * FROM (
                    SELECT j.*
                    FROM journal_ventes j
                    ${whereClause}
                    ORDER BY j.date_ecriture DESC, j.id DESC
                ) WHERE ROWNUM <= :limit
            `, fallbackBinds);
        }

        // Totaux
        const totalsResult = await db.execute(`
            SELECT 
                NVL(SUM(montant_ht), 0) as total_ht,
                NVL(SUM(montant_tva), 0) as total_tva,
                NVL(SUM(montant_ttc), 0) as total_ttc
            FROM journal_ventes j ${whereClause}
        `, binds);

        res.json({
            success: true,
            data: result.rows,
            totals: totalsResult.rows[0],
            pagination: {
                page,
                limit,
                total: totalRecords,
                pages: Math.ceil(totalRecords / limit)
            }
        });
    } catch (err) {
        console.error('Journal error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/journal/stats - Statistiques du journal des ventes
router.get('/stats', async (req, res) => {
    try {
        // Total global
        const globalResult = await db.execute(`
            SELECT 
                COUNT(*) as nb_ecritures,
                NVL(SUM(montant_ht), 0) as total_ht,
                NVL(SUM(montant_tva), 0) as total_tva,
                NVL(SUM(montant_ttc), 0) as total_ttc
            FROM journal_ventes
        `);

        // Par mois (12 derniers mois)
        const monthlyResult = await db.execute(`
            SELECT 
                TO_CHAR(date_ecriture, 'YYYY-MM') as mois,
                COUNT(*) as nb_ecritures,
                NVL(SUM(montant_ttc), 0) as total
            FROM journal_ventes
            WHERE date_ecriture >= ADD_MONTHS(SYSDATE, -12)
            GROUP BY TO_CHAR(date_ecriture, 'YYYY-MM')
            ORDER BY mois
        `);

        // Ce mois
        const currentMonthResult = await db.execute(`
            SELECT 
                COUNT(*) as nb_ecritures,
                NVL(SUM(montant_ht), 0) as total_ht,
                NVL(SUM(montant_tva), 0) as total_tva,
                NVL(SUM(montant_ttc), 0) as total_ttc
            FROM journal_ventes
            WHERE EXTRACT(MONTH FROM date_ecriture) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM date_ecriture) = EXTRACT(YEAR FROM SYSDATE)
        `);

        res.json({
            success: true,
            data: {
                global: globalResult.rows[0],
                parMois: monthlyResult.rows,
                ceMois: currentMonthResult.rows[0]
            }
        });
    } catch (err) {
        console.error('Journal stats error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/journal/export - Export du journal pour comptabilité
router.get('/export', async (req, res) => {
    try {
        const { startDate, endDate, format } = req.query;

        let whereClause = "WHERE 1=1";
        const binds = {};

        if (startDate) {
            whereClause += " AND j.date_ecriture >= TO_DATE(:startDate, 'YYYY-MM-DD')";
            binds.startDate = startDate;
        }
        if (endDate) {
            whereClause += " AND j.date_ecriture <= TO_DATE(:endDate, 'YYYY-MM-DD')";
            binds.endDate = endDate;
        }

        const result = await db.execute(`
            SELECT 
                j.num_piece,
                TO_CHAR(j.date_ecriture, 'DD/MM/YYYY') as date_ecriture,
                j.compte_debit,
                j.compte_credit,
                j.libelle,
                j.montant_ht,
                j.montant_tva,
                j.montant_ttc
            FROM journal_ventes j
            ${whereClause}
            ORDER BY j.date_ecriture, j.id
        `, binds);

        // Format CSV
        if (format === 'csv') {
            let csv = 'Numéro Pièce;Date;Compte Débit;Compte Crédit;Libellé;Montant HT;Montant TVA;Montant TTC\n';
            for (const row of result.rows) {
                csv += `${row.NUM_PIECE || ''};${row.DATE_ECRITURE};${row.COMPTE_DEBIT || ''};${row.COMPTE_CREDIT || ''};${row.LIBELLE || ''};${row.MONTANT_HT};${row.MONTANT_TVA};${row.MONTANT_TTC}\n`;
            }
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=journal_ventes_${startDate || 'all'}_${endDate || 'all'}.csv`);
            return res.send(csv);
        }

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
