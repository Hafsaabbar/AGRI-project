const express = require('express');
const router = express.Router();
const db = require('../config/database');
const oracledb = require('oracledb');

// GET /api/journal - Liste des ecritures du journal des ventes
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
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

        // Count
        const countResult = await db.execute(`
            SELECT COUNT(*) as total FROM journal_ventes j ${whereClause}
        `, binds);

        // Get ecritures
        const result = await db.execute(`
            SELECT j.*, f.invoice_number
            FROM journal_ventes j
            LEFT JOIN monthly_invoices f ON j.invoice_id = f.id
            ${whereClause}
            ORDER BY j.date_ecriture DESC, j.id DESC
            OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
        `, { ...binds, offset, limit });

        // Totaux
        const totalsResult = await db.execute(`
            SELECT 
                NVL(SUM(montant_ht), 0) as total_ht,
                NVL(SUM(montant_tva), 0) as total_tva,
                NVL(SUM(montant_ttc), 0) as total_ttc
            FROM journal_ventes j
            ${whereClause}
        `, binds);

        res.json({
            success: true,
            data: result.rows,
            totals: totalsResult.rows[0],
            pagination: {
                page,
                limit,
                total: countResult.rows[0].TOTAL,
                pages: Math.ceil(countResult.rows[0].TOTAL / limit)
            }
        });
    } catch (err) {
        console.error('Erreur liste journal:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/journal/stats - Statistiques du journal
router.get('/stats', async (req, res) => {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const result = await db.execute(`
            SELECT 
                COUNT(*) as nb_ecritures,
                NVL(SUM(montant_ht), 0) as total_ht,
                NVL(SUM(montant_tva), 0) as total_tva,
                NVL(SUM(montant_ttc), 0) as total_ttc
            FROM journal_ventes
            WHERE EXTRACT(MONTH FROM date_ecriture) = :month
            AND EXTRACT(YEAR FROM date_ecriture) = :year
        `, { month, year });

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/journal/ecriture - Creer une ecriture manuelle
router.post('/ecriture', async (req, res) => {
    try {
        const { invoice_id, date_ecriture, libelle, montant_ht, montant_tva, montant_ttc, compte_debit, compte_credit } = req.body;

        const result = await db.execute(`
            INSERT INTO journal_ventes (invoice_id, date_ecriture, libelle, montant_ht, montant_tva, montant_ttc, compte_debit, compte_credit)
            VALUES (:invoice_id, TO_DATE(:date_ecriture, 'YYYY-MM-DD'), :libelle, :montant_ht, :montant_tva, :montant_ttc, :compte_debit, :compte_credit)
            RETURNING id INTO :id
        `, {
            invoice_id: invoice_id || null,
            date_ecriture,
            libelle,
            montant_ht: montant_ht || 0,
            montant_tva: montant_tva || 0,
            montant_ttc: montant_ttc || montant_ht,
            compte_debit: compte_debit || '411000',
            compte_credit: compte_credit || '701000',
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        });

        res.json({
            success: true,
            message: 'Ecriture creee',
            ecritureId: result.outBinds.id[0]
        });
    } catch (err) {
        console.error('Erreur creation ecriture:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/journal/export - Export CSV du journal
router.get('/export', async (req, res) => {
    try {
        const startDate = req.query.startDate || '';
        const endDate = req.query.endDate || '';
        const format = req.query.format || 'csv';

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
            SELECT j.num_piece, j.date_ecriture, j.libelle, j.compte_debit, j.compte_credit, 
                   j.montant_ht, j.montant_tva, j.montant_ttc, f.invoice_number
            FROM journal_ventes j
            LEFT JOIN monthly_invoices f ON j.invoice_id = f.id
            ${whereClause}
            ORDER BY j.date_ecriture, j.id
        `, binds);

        if (format === 'csv') {
            let csv = 'Numero Piece;Date;Libelle;Compte Debit;Compte Credit;Montant HT;TVA;Montant TTC;N Facture\n';
            for (const row of result.rows) {
                const dateStr = row.DATE_ECRITURE ? new Date(row.DATE_ECRITURE).toLocaleDateString('fr-FR') : '';
                csv += `${row.NUM_PIECE || ''};${dateStr};${row.LIBELLE || ''};${row.COMPTE_DEBIT || ''};${row.COMPTE_CREDIT || ''};${row.MONTANT_HT || 0};${row.MONTANT_TVA || 0};${row.MONTANT_TTC || 0};${row.INVOICE_NUMBER || ''}\n`;
            }
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=journal_ventes.csv');
            res.send('\uFEFF' + csv); // BOM for Excel
        } else {
            res.json({ success: true, data: result.rows });
        }
    } catch (err) {
        console.error('Erreur export journal:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/journal/:id - Supprimer une ecriture
router.delete('/:id', async (req, res) => {
    try {
        await db.execute(`DELETE FROM journal_ventes WHERE id = :id`, { id: req.params.id });
        res.json({ success: true, message: 'Ecriture supprimee' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
