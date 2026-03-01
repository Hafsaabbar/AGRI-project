const express = require('express');
const router = express.Router();
const db = require('../config/database');
const oracledb = require('oracledb');

// GET /api/factures - Liste des factures (order_invoices)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';
        const search = req.query.search || '';
        const year = req.query.year || '';

        let whereClause = "WHERE 1=1";
        const binds = {};

        if (status) {
            whereClause += " AND f.status = :status";
            binds.status = status;
        }
        if (search) {
            whereClause += " AND (UPPER(c.nom_client) LIKE UPPER(:search) OR UPPER(f.invoice_number) LIKE UPPER(:search))";
            binds.search = `%${search}%`;
        }
        if (year) {
            whereClause += " AND EXTRACT(YEAR FROM f.created_at) = :year";
            binds.year = parseInt(year);
        }

        // Count total
        const countResult = await db.execute(
            `SELECT COUNT(*) as total FROM order_invoices f 
             JOIN clients c ON f.client_id = c.id ${whereClause}`,
            binds
        );

        // Get factures with client info
        const result = await db.execute(`
            SELECT f.*, c.nom_client, c.prenom, c.entreprise, c.type_client, c.email, c.tel,
                   EXTRACT(MONTH FROM f.created_at) as month,
                   EXTRACT(YEAR FROM f.created_at) as year
            FROM order_invoices f
            JOIN clients c ON f.client_id = c.id
            ${whereClause}
            ORDER BY f.created_at DESC, f.id DESC
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
        console.error('Erreur liste factures:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/factures/stats - Statistiques factures
router.get('/stats', async (req, res) => {
    try {
        const globalResult = await db.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as en_attente,
                SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) as payees,
                SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) as en_retard,
                NVL(SUM(total_ttc), 0) as total_facture,
                NVL(SUM(CASE WHEN status = 'PAID' THEN total_ttc ELSE 0 END), 0) as total_encaisse,
                NVL(SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_ttc ELSE 0 END), 0) as total_impaye
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
                global: globalResult.rows[0],
                moisEnCours: currentMonthResult.rows[0]
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/factures/:id - Details d'une facture
router.get('/:id', async (req, res) => {
    try {
        const factureResult = await db.execute(`
            SELECT f.*, c.nom_client, c.prenom, c.entreprise, c.type_client, c.email, c.tel, c.adresse, c.ville,
                   o.order_number
            FROM order_invoices f
            JOIN clients c ON f.client_id = c.id
            LEFT JOIN orders o ON f.order_id = o.id
            WHERE f.id = :id
        `, { id: req.params.id });

        if (factureResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Facture non trouvee' });
        }

        const facture = factureResult.rows[0];

        // Items de la facture (produits factures)
        const itemsResult = await db.execute(`
            SELECT oi.*, p.product_name, p.product_code
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = :orderId
            ORDER BY p.product_name
        `, { orderId: facture.ORDER_ID });

        // Bons de livraison associes
        const blResult = await db.execute(`
            SELECT dn.id, dn.bl_number, dn.created_at as bl_date
            FROM delivery_notes dn
            WHERE dn.order_id = :orderId
            ORDER BY dn.created_at
        `, { orderId: facture.ORDER_ID });

        res.json({
            success: true,
            data: {
                facture: facture,
                items: itemsResult.rows,
                bonsLivraison: blResult.rows
            }
        });
    } catch (err) {
        console.error('Erreur details facture:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/factures/:id/status - Changer le statut d'une facture (Rapide)
router.put('/:id/status', async (req, res) => {
    try {
        const { status, payment_method } = req.body;

        let updateQuery = `UPDATE order_invoices SET status = :status`;
        const binds = { status, id: req.params.id };

        if (status === 'PAID') {
            updateQuery += `, paid_date = SYSDATE, payment_method = :payment_method`;
            binds.payment_method = payment_method || 'Virement';
        }

        updateQuery += ` WHERE id = :id`;
        await db.execute(updateQuery, binds);

        // Si payee, creer l'ecriture au journal des ventes (le lendemain J+1)
        if (status === 'PAID') {
            const factureResult = await db.execute(
                `SELECT * FROM order_invoices WHERE id = :id`,
                { id: req.params.id }
            );
            const facture = factureResult.rows[0];

            await db.execute(`
                INSERT INTO journal_ventes (invoice_id, date_ecriture, libelle, montant_ht, montant_tva, montant_ttc, compte_debit, compte_credit)
                VALUES (:invoice_id, SYSDATE + 1, :libelle, :montant_ht, :montant_tva, :montant_ttc, '411000', '701000')
            `, {
                invoice_id: parseInt(req.params.id),
                libelle: `Facture ${facture.INVOICE_NUMBER} - Paiement recu`,
                montant_ht: facture.TOTAL_HT,
                montant_tva: facture.TOTAL_TVA,
                montant_ttc: facture.TOTAL_TTC
            });
        }

        res.json({ success: true, message: 'Statut mis a jour' });
    } catch (err) {
        console.error('Erreur update status:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/factures - Creer une nouvelle facture
router.post('/', async (req, res) => {
    try {
        const { order_id, client_id, total_ht, total_tva, total_ttc, notes } = req.body;

        const result = await db.execute(`
            INSERT INTO order_invoices (order_id, client_id, total_ht, total_tva, total_ttc, status, notes, created_at)
            VALUES (:order_id, :client_id, :total_ht, :total_tva, :total_ttc, 'PENDING', :notes, SYSDATE)
            RETURNING id INTO :id
        `, {
            order_id: order_id || null,
            client_id,
            total_ht,
            total_tva,
            total_ttc,
            notes: notes || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        });

        res.json({
            success: true,
            message: 'Facture creee',
            invoiceId: result.outBinds.id[0]
        });
    } catch (err) {
        console.error('Erreur creation facture:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/factures/:id - Supprimer une facture
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // 1. D'abord supprimer les liens avec les bons de livraison
        await db.execute(`DELETE FROM invoice_delivery_notes WHERE invoice_id = :id`, { id });

        // 2. Supprimer les ecritures du journal liees
        await db.execute(`DELETE FROM journal_ventes WHERE invoice_id = :id`, { id });

        // 3. Supprimer la facture
        await db.execute(`DELETE FROM order_invoices WHERE id = :id`, { id });

        res.json({ success: true, message: 'Facture supprimee avec succes' });
    } catch (err) {
        console.error('Erreur suppression facture:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/factures/:id - Modifier une facture (Complet)
router.put('/:id', async (req, res) => {
    try {
        const { total_ht, total_tva, total_ttc, status, notes } = req.body;
        console.log(`Modification facture ${req.params.id}:`, req.body);

        // 1. Recuperer l'ancien statut
        const oldResult = await db.execute(`SELECT status FROM order_invoices WHERE id = :id`, { id: req.params.id });
        if (oldResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Facture non trouvee' });
        }
        const oldStatus = oldResult.rows[0].STATUS;

        // 2. Construire la requête de mise à jour
        let updateFields = [];
        const binds = { id: req.params.id };

        if (total_ht !== undefined) { binds.total_ht = total_ht; updateFields.push('total_ht = :total_ht'); }
        if (total_tva !== undefined) { binds.total_tva = total_tva; updateFields.push('total_tva = :total_tva'); }
        if (total_ttc !== undefined) { binds.total_ttc = total_ttc; updateFields.push('total_ttc = :total_ttc'); }
        if (notes !== undefined) { binds.notes = notes; updateFields.push('notes = :notes'); }

        if (status !== undefined) {
            binds.status = status;
            updateFields.push('status = :status');

            // Si passage a PAID, mettre a jour paid_date et payment_method
            if (status === 'PAID' && oldStatus !== 'PAID') {
                updateFields.push('paid_date = SYSDATE');
                updateFields.push('payment_method = :payment_method');
                binds.payment_method = 'Virement';
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'Aucun champ a modifier' });
        }

        // 3. Executer la mise à jour (UNE SEULE FOIS)
        const sql = `UPDATE order_invoices SET ${updateFields.join(', ')} WHERE id = :id`;
        await db.execute(sql, binds);

        // 4. Si passage a PAID, creer l'ecriture au journal
        if (status === 'PAID' && oldStatus !== 'PAID') {
            const factureResult = await db.execute(
                `SELECT * FROM order_invoices WHERE id = :id`,
                { id: req.params.id }
            );
            const facture = factureResult.rows[0];

            await db.execute(`
                INSERT INTO journal_ventes (invoice_id, date_ecriture, libelle, montant_ht, montant_tva, montant_ttc, compte_debit, compte_credit)
                VALUES (:invoice_id, SYSDATE + 1, :libelle, :montant_ht, :montant_tva, :montant_ttc, '411000', '701000')
            `, {
                invoice_id: parseInt(req.params.id),
                libelle: `Facture ${facture.INVOICE_NUMBER} - Paiement recu (Modif)`,
                montant_ht: facture.TOTAL_HT,
                montant_tva: facture.TOTAL_TVA,
                montant_ttc: facture.TOTAL_TTC
            });
        }

        res.json({ success: true, message: 'Facture mise a jour' });
    } catch (err) {
        console.error('Erreur modification facture:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/factures/:id/pdf - Telecharger facture en PDF
router.get('/:id/pdf', async (req, res) => {
    try {
        // Recuperer les details de la facture
        const factureResult = await db.execute(`
            SELECT f.*, c.nom_client, c.prenom, c.entreprise, c.type_client, c.email, c.tel, c.adresse, c.ville, c.code_postal
            FROM order_invoices f
            JOIN clients c ON f.client_id = c.id
            WHERE f.id = :id
        `, { id: req.params.id });

        if (factureResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Facture non trouvee' });
        }

        const f = factureResult.rows[0];

        // Recuperer les produits
        const itemsResult = await db.execute(`
            SELECT oi.*, p.product_name, p.product_code
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            WHERE oi.order_id = :orderId
            ORDER BY p.product_name
        `, { orderId: f.ORDER_ID });

        // Generer HTML pour PDF
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Facture ${f.INVOICE_NUMBER}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 40px; }
                .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .company { font-size: 18px; font-weight: bold; color: #2d6a4f; }
                .company-info { font-size: 10px; color: #666; }
                .invoice-title { font-size: 24px; font-weight: bold; text-align: right; color: #2d6a4f; }
                .invoice-number { font-size: 14px; text-align: right; }
                .client-box { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
                .client-title { font-weight: bold; margin-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th { background: #2d6a4f; color: white; padding: 10px; text-align: left; }
                td { padding: 8px; border-bottom: 1px solid #ddd; }
                .totals { text-align: right; margin-top: 20px; }
                .totals table { width: 300px; margin-left: auto; }
                .totals th { background: #f5f5f5; color: #333; }
                .total-ttc { font-size: 16px; font-weight: bold; color: #2d6a4f; }
                .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
                .status { display: inline-block; padding: 5px 10px; border-radius: 3px; font-weight: bold; }
                .status-paid { background: #d4edda; color: #155724; }
                .status-pending { background: #fff3cd; color: #856404; }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="company">AGRI</div>
                    <div class="company-info">
                        Societe de Vente de Produits Agricoles<br>
                        Casablanca, Maroc<br>
                        RC: 123456 - IF: 12345678
                    </div>
                </div>
                <div>
                    <div class="invoice-title">FACTURE</div>
                    <div class="invoice-number">N: ${f.INVOICE_NUMBER || '-'}</div>
                    <div>Date: ${new Date(f.CREATED_AT).toLocaleDateString('fr-FR')}</div>
                    <div class="status ${f.STATUS === 'PAID' ? 'status-paid' : 'status-pending'}">${f.STATUS === 'PAID' ? 'PAYEE' : 'EN ATTENTE'}</div>
                </div>
            </div>

            <div class="client-box">
                <div class="client-title">Client</div>
                <strong>${f.NOM_CLIENT} ${f.PRENOM || ''}</strong><br>
                ${f.ENTREPRISE ? f.ENTREPRISE + '<br>' : ''}
                ${f.ADRESSE || ''}<br>
                ${f.VILLE || ''} ${f.CODE_POSTAL || ''}<br>
                ${f.EMAIL ? 'Email: ' + f.EMAIL + '<br>' : ''}
                ${f.TEL ? 'Tel: ' + f.TEL : ''}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Designation</th>
                        <th>Quantite</th>
                        <th>Prix Unitaire</th>
                        <th>Total HT</th>
                    </tr>
                </thead>
                <tbody>
                    ${(itemsResult.rows || []).map(item => `
                        <tr>
                            <td>${item.PRODUCT_CODE || '-'}</td>
                            <td>${item.PRODUCT_NAME}</td>
                            <td>${item.QUANTITY}</td>
                            <td>${(item.PRIX_UNITAIRE || 0).toFixed(2)} MAD</td>
                            <td>${((item.QUANTITY || 0) * (item.PRIX_UNITAIRE || 0)).toFixed(2)} MAD</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <table>
                    <tr>
                        <th>Total HT</th>
                        <td>${(f.TOTAL_HT || 0).toFixed(2)} MAD</td>
                    </tr>
                    <tr>
                        <th>TVA (20%)</th>
                        <td>${(f.TOTAL_TVA || 0).toFixed(2)} MAD</td>
                    </tr>
                    <tr>
                        <th class="total-ttc">Total TTC</th>
                        <td class="total-ttc">${(f.TOTAL_TTC || 0).toFixed(2)} MAD</td>
                    </tr>
                </table>
            </div>

            <div class="footer">
                <p>Merci pour votre confiance</p>
                <p>AGRI - Societe de Vente de Produits Agricoles - Casablanca, Maroc</p>
            </div>
        </body>
        </html>
        `;

        // Envoyer comme HTML (navigateur peut l'imprimer en PDF)
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="facture_${f.INVOICE_NUMBER}.html"`);
        res.send(html);
    } catch (err) {
        console.error('Erreur generation PDF:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/factures/generate - Generer les factures mensuelles consolidees par client
router.post('/generate', async (req, res) => {
    try {
        const { month, year } = req.body;

        if (!month || !year) {
            return res.status(400).json({ success: false, error: 'Mois et annee requis' });
        }

        console.log(`Generation factures pour ${month}/${year}`);

        // 1. Recuperer tous les BL non factures du mois, groupes par client
        const blResult = await db.execute(`
            SELECT 
                c.id as client_id,
                c.nom_client,
                c.prenom,
                c.entreprise,
                c.type_client,
                dn.id as bl_id,
                dn.bl_number,
                dn.created_at as bl_date,
                dni.product_id,
                p.product_name,
                p.product_code,
                dni.quantity_delivered,
                p.prix_unitaire
            FROM delivery_notes dn
            JOIN clients c ON dn.client_id = c.id
            JOIN delivery_note_items dni ON dni.delivery_note_id = dn.id
            JOIN products p ON dni.product_id = p.product_id
            WHERE EXTRACT(MONTH FROM dn.created_at) = :month
            AND EXTRACT(YEAR FROM dn.created_at) = :year
            AND NOT EXISTS (
                SELECT 1 FROM invoice_delivery_notes idn WHERE idn.delivery_note_id = dn.id
            )
            ORDER BY c.id, dn.created_at, p.product_name
        `, { month, year });

        if (blResult.rows.length === 0) {
            return res.json({
                success: true,
                message: 'Aucun bon de livraison non facture pour ce mois',
                generated: 0
            });
        }

        // 2. Grouper par client
        const clientsData = {};
        for (const row of blResult.rows) {
            const clientId = row.CLIENT_ID;
            if (!clientsData[clientId]) {
                clientsData[clientId] = {
                    id: clientId,
                    nom_client: row.NOM_CLIENT,
                    prenom: row.PRENOM,
                    entreprise: row.ENTREPRISE,
                    type_client: row.TYPE_CLIENT,
                    bls: {},  // Map: blId -> montant
                    products: {}
                };
            }

            // Ajouter le BL avec son montant cumulé
            const blId = row.BL_ID;
            const lineAmount = row.QUANTITY_DELIVERED * row.PRIX_UNITAIRE;
            if (!clientsData[clientId].bls[blId]) {
                clientsData[clientId].bls[blId] = 0;
            }
            clientsData[clientId].bls[blId] += lineAmount;

            // Agreger les produits
            const productId = row.PRODUCT_ID;
            if (!clientsData[clientId].products[productId]) {
                clientsData[clientId].products[productId] = {
                    product_id: productId,
                    product_name: row.PRODUCT_NAME,
                    product_code: row.PRODUCT_CODE,
                    quantity: 0,
                    prix_unitaire: row.PRIX_UNITAIRE
                };
            }
            clientsData[clientId].products[productId].quantity += row.QUANTITY_DELIVERED;
        }

        // 3. Creer une facture par client
        let facturesCreated = 0;
        const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
        const monthName = monthNames[month - 1];

        for (const clientId in clientsData) {
            const client = clientsData[clientId];

            // Calculer le total HT
            let totalHT = 0;
            for (const prodId in client.products) {
                const prod = client.products[prodId];
                totalHT += prod.quantity * prod.prix_unitaire;
            }

            // Appliquer la remise 5% pour les professionnels
            let remise = 0;
            if (client.type_client === 'PROFESSIONNEL') {
                remise = totalHT * 0.05;
                totalHT = totalHT - remise;
            }

            // Calculer TVA et TTC
            const totalTVA = totalHT * 0.20;
            const totalTTC = totalHT + totalTVA;

            // Generer le numero de facture
            const invoiceNumber = `FACT-${year}${String(month).padStart(2, '0')}-${String(clientId).padStart(4, '0')}`;

            // Notes de la facture
            const blIds = Object.keys(client.bls);
            const blNumbers = blIds.length;
            const notes = `Facture mensuelle ${monthName} ${year} - ${blNumbers} bon(s) de livraison${remise > 0 ? ` - Remise pro: ${remise.toFixed(2)} MAD` : ''}`;

            // Inserer la facture
            const insertResult = await db.execute(`
                INSERT INTO order_invoices (
                    client_id, 
                    invoice_number, 
                    total_ht, 
                    total_tva, 
                    total_ttc, 
                    status, 
                    notes, 
                    created_at,
                    invoice_month,
                    invoice_year
                )
                VALUES (
                    :client_id, 
                    :invoice_number, 
                    :total_ht, 
                    :total_tva, 
                    :total_ttc, 
                    'PENDING', 
                    :notes, 
                    SYSDATE,
                    :month,
                    :year
                )
                RETURNING id INTO :id
            `, {
                client_id: parseInt(clientId),
                invoice_number: invoiceNumber,
                total_ht: totalHT,
                total_tva: totalTVA,
                total_ttc: totalTTC,
                notes: notes,
                month: month,
                year: year,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            });

            const invoiceId = insertResult.outBinds.id[0];

            // Lier les BL a cette facture avec leur montant
            for (const blId in client.bls) {
                const montantBl = client.bls[blId];
                await db.execute(`
                    INSERT INTO invoice_delivery_notes (invoice_id, delivery_note_id, montant_bl)
                    VALUES (:invoice_id, :delivery_note_id, :montant_bl)
                `, {
                    invoice_id: invoiceId,
                    delivery_note_id: parseInt(blId),
                    montant_bl: montantBl
                });
            }

            facturesCreated++;
            console.log(`Facture ${invoiceNumber} creee pour client ${client.nom_client}: ${totalTTC.toFixed(2)} MAD`);
        }

        res.json({
            success: true,
            message: `${facturesCreated} facture(s) mensuelle(s) generee(s) pour ${monthName} ${year}`,
            generated: facturesCreated
        });

    } catch (err) {
        console.error('Erreur generation factures:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
