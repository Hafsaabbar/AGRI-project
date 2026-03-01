const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/journal - Liste des écritures du journal des ventes
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
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

        // Get écritures with invoice and client info
        const result = await db.execute(`
            SELECT j.*, oi.invoice_number, c.nom_client, c.prenom, c.entreprise
            FROM journal_ventes j
            LEFT JOIN order_invoices oi ON j.invoice_id = oi.id
            LEFT JOIN clients c ON oi.client_id = c.id
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
            FROM journal_ventes j ${whereClause}
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
        console.error('Erreur journal:', err);
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
        res.status(500).json({ success: false, error: err.message });
    }
});

const PDFDocument = require('pdfkit');

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
                j.montant_ttc,
                oi.invoice_number,
                NVL(c.nom_client, '') || ' ' || NVL(c.prenom, '') as client
            FROM journal_ventes j
            LEFT JOIN order_invoices oi ON j.invoice_id = oi.id
            LEFT JOIN clients c ON oi.client_id = c.id
            ${whereClause}
            ORDER BY j.date_ecriture, j.id
        `, binds);

        // Format CSV
        if (format === 'csv') {
            let csv = 'Numéro Pièce;Date;Compte Débit;Compte Crédit;Libellé;Montant HT;Montant TVA;Montant TTC;N° Facture;Client\n';
            for (const row of result.rows) {
                csv += `${row.NUM_PIECE};${row.DATE_ECRITURE};${row.COMPTE_DEBIT};${row.COMPTE_CREDIT};${row.LIBELLE};${row.MONTANT_HT};${row.MONTANT_TVA};${row.MONTANT_TTC};${row.INVOICE_NUMBER};${row.CLIENT}\n`;
            }
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=journal_ventes_${startDate || 'all'}_${endDate || 'all'}.csv`);
            return res.send(csv);
        }

        // Format PDF
        else if (format === 'pdf') {
            const doc = new PDFDocument({ layout: 'landscape', margin: 30 }); // Marges réduites
            const filename = `Journal_Ventes_${startDate || 'TOUT'}_${endDate || 'TOUT'}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            doc.pipe(res);

            // En-tête
            doc.fontSize(20).text('AGRI - Journal des Ventes', { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(12).text(`Période: ${startDate || 'Début'} au ${endDate || 'Fin'}`, { align: 'center' });
            doc.moveDown(2); // Plus d'espace après le titre

            // Définition des colonnes (X positions)
            const col = {
                piece: 30,
                date: 130,
                libelle: 200,
                debit: 430,
                credit: 480,
                ht: 530,
                tva: 610,
                ttc: 690
            };

            // Largeurs approximatives
            const width = {
                piece: 95,
                date: 60,
                libelle: 220,
                compte: 40,
                montant: 80
            };

            const startY = doc.y;
            let y = startY;

            // Fonction pour dessiner une ligne
            const drawRow = (y, r, isHeader = false) => {
                if (isHeader) doc.font('Helvetica-Bold');
                else doc.font('Helvetica');

                const fontSize = isHeader ? 10 : 8;
                doc.fontSize(fontSize);

                // N° Pièce
                doc.text(r.NUM_PIECE || '-', col.piece, y, { width: width.piece, ellipsis: true });
                // Date
                doc.text(r.DATE_ECRITURE, col.date, y, { width: width.date });
                // Libellé (coupé si trop long)
                doc.text(isHeader ? r.LIBELLE : r.LIBELLE.substring(0, 50), col.libelle, y, { width: width.libelle, ellipsis: true });

                // Comptes (centrés en théorie, mais align left ici pour simplifier)
                doc.text(r.COMPTE_DEBIT, col.debit, y, { width: width.compte });
                doc.text(r.COMPTE_CREDIT, col.credit, y, { width: width.compte });

                // Montants (Alignés à droite)
                const formatM = (m) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(m);

                doc.text(isHeader ? r.MONTANT_HT : formatM(r.MONTANT_HT), col.ht, y, { width: width.montant, align: 'right' });
                doc.text(isHeader ? r.MONTANT_TVA : formatM(r.MONTANT_TVA), col.tva, y, { width: width.montant, align: 'right' });
                doc.text(isHeader ? r.MONTANT_TTC : formatM(r.MONTANT_TTC), col.ttc, y, { width: width.montant, align: 'right' });
            };

            // En-tête tableau
            drawRow(y, {
                NUM_PIECE: 'N° Pièce',
                DATE_ECRITURE: 'Date',
                LIBELLE: 'Libellé',
                COMPTE_DEBIT: 'Débit',
                COMPTE_CREDIT: 'Crédit',
                MONTANT_HT: 'Montant HT',
                MONTANT_TVA: 'Montant TVA',
                MONTANT_TTC: 'Montant TTC'
            }, true);

            doc.moveTo(30, y + 15).lineTo(760, y + 15).stroke(); // Ligne sous header
            y += 25;

            for (const row of result.rows) {
                if (y > 530) {
                    doc.addPage({ layout: 'landscape', margin: 30 });
                    y = 50;
                    // Répéter header sur nouvelle page
                    drawRow(y, {
                        NUM_PIECE: 'N° Pièce',
                        DATE_ECRITURE: 'Date',
                        LIBELLE: 'Libellé',
                        COMPTE_DEBIT: 'Débit',
                        COMPTE_CREDIT: 'Crédit',
                        MONTANT_HT: 'Montant HT',
                        MONTANT_TVA: 'Montant TVA',
                        MONTANT_TTC: 'Montant TTC'
                    }, true);
                    doc.moveTo(30, y + 15).lineTo(760, y + 15).stroke();
                    y += 25;
                }
                drawRow(y, row);
                y += 15;
            }

            doc.end();
            return;
        }

        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Erreur export journal:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/journal/ecriture - Créer une écriture manuelle
router.post('/ecriture', async (req, res) => {
    try {
        const { invoice_id, date_ecriture, libelle, montant_ht, montant_tva, montant_ttc, compte_debit, compte_credit } = req.body;
        const oracledb = require('oracledb');

        const result = await db.execute(`
            INSERT INTO journal_ventes (invoice_id, date_ecriture, libelle, montant_ht, montant_tva, montant_ttc, compte_debit, compte_credit)
            VALUES (:invoice_id, TO_DATE(:date_ecriture, 'YYYY-MM-DD'), :libelle, :montant_ht, :montant_tva, :montant_ttc, :compte_debit, :compte_credit)
            RETURNING id INTO :id
        `, {
            invoice_id,
            date_ecriture,
            libelle,
            montant_ht,
            montant_tva,
            montant_ttc,
            compte_debit: compte_debit || '411000',
            compte_credit: compte_credit || '701000',
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        });

        res.json({
            success: true,
            message: 'Écriture créée avec succès',
            ecritureId: result.outBinds.id[0]
        });
    } catch (err) {
        console.error('Erreur création écriture:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/journal/:id - Supprimer une écriture
router.delete('/:id', async (req, res) => {
    try {
        await db.execute(`DELETE FROM journal_ventes WHERE id = :id`, { id: req.params.id });
        res.json({ success: true, message: 'Écriture supprimée' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
