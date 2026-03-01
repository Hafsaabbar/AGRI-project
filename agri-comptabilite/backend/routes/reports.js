const express = require('express');
const router = express.Router();
const db = require('../config/database');
const PDFDocument = require('pdfkit');

// Helper pour formatter les prix
function formatMoney(amount) {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount || 0);
}

// Helper pour l'en-tête PDF
function generateHeader(doc, title, subtitle = '') {
    doc.fontSize(20).text('AGRI', 50, 50, { align: 'left', continued: true });
    doc.fontSize(10).text(' - Service Comptabilité', { align: 'left' });

    doc.fontSize(20).text(title, 50, 100, { align: 'center' });
    if (subtitle) {
        doc.fontSize(12).text(subtitle, { align: 'center' });
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
}

// Helper pour les tableaux
function generateTableRow(doc, y, c1, c2, c3, c4, c5) {
    doc.fontSize(10)
        .text(c1, 50, y)
        .text(c2, 150, y)
        .text(c3, 280, y, { width: 90, align: 'right' })
        .text(c4, 370, y, { width: 90, align: 'right' })
        .text(c5, 460, y, { width: 90, align: 'right' });
}

// GET /api/reports/ca - Export CA mensuel (PDF/CSV)
router.get('/ca', async (req, res) => {
    try {
        const year = req.query.year || new Date().getFullYear();
        const format = req.query.format || 'pdf';

        // Récupérer CA par mois
        const result = await db.execute(`
            SELECT 
                TO_CHAR(created_at, 'MM/YYYY') as mois,
                COUNT(*) as nb_factures,
                NVL(SUM(total_ht), 0) as total_ht,
                NVL(SUM(total_tva), 0) as total_tva,
                NVL(SUM(total_ttc), 0) as total_ttc
            FROM order_invoices
            WHERE EXTRACT(YEAR FROM created_at) = :year
            AND status != 'CANCELLED'
            GROUP BY TO_CHAR(created_at, 'MM/YYYY')
            ORDER BY mois
        `, { year: parseInt(year) });

        // Total annuel
        const totalResult = await db.execute(`
            SELECT 
                COUNT(*) as nb_factures,
                NVL(SUM(total_ht), 0) as total_ht,
                NVL(SUM(total_tva), 0) as total_tva,
                NVL(SUM(total_ttc), 0) as total_ttc
            FROM order_invoices
            WHERE EXTRACT(YEAR FROM created_at) = :year
            AND status != 'CANCELLED'
        `, { year: parseInt(year) });
        const total = totalResult.rows[0];

        if (format === 'csv') {
            let csv = `Rapport Client d'Affaires - Année ${year}\n`;
            csv += 'Mois;Nombre Factures;Total HT;Total TVA;Total TTC\n';

            for (const row of result.rows) {
                csv += `${row.MOIS};${row.NB_FACTURES};${row.TOTAL_HT};${row.TOTAL_TVA};${row.TOTAL_TTC}\n`;
            }
            csv += `TOTAL;${total.NB_FACTURES};${total.TOTAL_HT};${total.TOTAL_TVA};${total.TOTAL_TTC}\n`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=rapport_ca_${year}.csv`);
            res.send(csv);
        } else {
            // PDF
            const doc = new PDFDocument();
            const filename = `Rapport_CA_${year}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            doc.pipe(res);

            generateHeader(doc, `Rapport Chiffre d'Affaires`, `Année ${year}`);

            let i = 0;
            const startY = 160;
            doc.font('Helvetica-Bold');
            generateTableRow(doc, startY, 'Mois', 'Nb Factures', 'Total HT', 'Total TVA', 'Total TTC');
            doc.moveTo(50, startY + 15).lineTo(550, startY + 15).stroke();
            doc.font('Helvetica');

            let y = startY + 25;

            for (const row of result.rows) {
                generateTableRow(doc, y,
                    row.MOIS,
                    row.NB_FACTURES.toString(),
                    formatMoney(row.TOTAL_HT),
                    formatMoney(row.TOTAL_TVA),
                    formatMoney(row.TOTAL_TTC)
                );
                y += 20;
            }

            doc.moveDown();
            doc.moveTo(50, y).lineTo(550, y).stroke();
            y += 10;
            doc.font('Helvetica-Bold');
            generateTableRow(doc, y, 'TOTAL ANNUEL', total.NB_FACTURES.toString(), formatMoney(total.TOTAL_HT), formatMoney(total.TOTAL_TVA), formatMoney(total.TOTAL_TTC));

            doc.end();
        }

    } catch (err) {
        console.error('Erreur rapport CA:', err);
        res.status(500).send('Erreur génération rapport');
    }
});

// GET /api/reports/impayes - Export Impayés (PDF/CSV)
router.get('/impayes', async (req, res) => {
    try {
        const format = req.query.format || 'pdf';

        const result = await db.execute(`
            SELECT 
                f.invoice_number,
                TO_CHAR(f.due_date, 'DD/MM/YYYY') as date_echeance,
                TO_CHAR(f.created_at, 'DD/MM/YYYY') as date_facture,
                c.nom_client || ' ' || NVL(c.prenom, '') as client,
                c.email,
                c.tel,
                f.total_ttc,
                f.status
            FROM order_invoices f
            JOIN clients c ON f.client_id = c.id
            WHERE f.status IN ('PENDING', 'OVERDUE')
            ORDER BY f.due_date ASC
        `);

        if (format === 'csv') {
            let csv = 'Rapport des Impayés\n';
            csv += 'N° Facture;Date;Échéance;Client;Email;Téléphone;Montant TTC;Statut\n';

            let totalImpaye = 0;

            for (const row of result.rows) {
                csv += `${row.INVOICE_NUMBER};${row.DATE_FACTURE};${row.DATE_ECHEANCE};${row.CLIENT};${row.EMAIL};${row.TEL};${row.TOTAL_TTC};${row.STATUS}\n`;
                totalImpaye += row.TOTAL_TTC;
            }
            csv += `;;;;;;TOTAL IMPAYÉ;${totalImpaye}\n`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename=rapport_impayes_${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csv);
        } else {
            // PDF
            const doc = new PDFDocument();
            const filename = `Rapport_Impayes_${new Date().toISOString().split('T')[0]}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            doc.pipe(res);

            generateHeader(doc, 'Rapport des Impayés', `En date du ${new Date().toLocaleDateString('fr-FR')}`);

            let y = 160;
            doc.font('Helvetica-Bold');

            doc.fontSize(10)
                .text('N° Facture', 50, y)
                .text('Client', 130, y)
                .text('Échéance', 280, y)
                .text('Statut', 360, y)
                .text('Montant TTC', 470, y, { align: 'right' });

            doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
            doc.font('Helvetica');
            y += 25;

            let totalImpaye = 0;

            for (const row of result.rows) {
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }

                doc.fontSize(10)
                    .text(row.INVOICE_NUMBER || '-', 50, y)
                    .text(row.CLIENT, 130, y, { width: 140 })
                    .text(row.DATE_ECHEANCE, 280, y)
                    .fillColor(row.STATUS === 'OVERDUE' ? 'red' : 'black')
                    .text(row.STATUS, 360, y)
                    .fillColor('black')
                    .text(formatMoney(row.TOTAL_TTC), 470, y, { align: 'right' });

                y += 20;
                totalImpaye += row.TOTAL_TTC;
            }

            doc.moveDown();
            doc.moveTo(50, y).lineTo(550, y).stroke();
            y += 10;
            doc.font('Helvetica-Bold');
            doc.text('TOTAL IMPAYÉ', 300, y);
            doc.text(formatMoney(totalImpaye), 470, y, { align: 'right' });

            doc.end();
        }

    } catch (err) {
        console.error('Erreur rapport Impayés:', err);
        res.status(500).send('Erreur génération rapport');
    }
});

module.exports = router;
