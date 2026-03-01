const oracledb = require('oracledb');
const PDFDocument = require('pdfkit');
const db = require('../config/db');

// Helper function to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount || 0);
};

// Helper function to format date
const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
};

// Helper to add header to PDF
const addHeader = (doc, title) => {
    // Logo
    doc.fontSize(25).fillColor('#16a34a').text('AgriMart', 50, 45);
    doc.fontSize(10).fillColor('#999').text('Plateforme de Gestion Agricole', 50, 75);

    // Document Title
    doc.fontSize(20).fillColor('#333').text(title, 350, 50, { align: 'right' });

    // Line separator
    doc.moveTo(50, 100).lineTo(550, 100).strokeColor('#eee').stroke();

    return 120; // Return next Y position
};

// ============================================
// PDF GENERATORS
// ============================================

exports.getOrderPdf = async (req, res) => {
    const orderId = req.params.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();

        let securityClause = '';
        const binds = { orderId };

        if (req.user) { // Client
            securityClause = 'AND o.CLIENT_ID = :clientId';
            binds.clientId = req.user.id;
        } else if (req.agent) { // Agent
            securityClause = 'AND c.APPROVED_BY_AGENT = :agentId';
            binds.agentId = req.agent.id;
        } else {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        // Get order with client info
        const orderSql = `
            SELECT o.*, c.NOM_CLIENT, c.PRENOM, c.ENTREPRISE,
                   c.ADRESSE, c.VILLE, c.CODE_POSTAL, c.TEL, c.EMAIL
            FROM ORDERS o
            JOIN CLIENTS c ON o.CLIENT_ID = c.ID
            WHERE o.ID = :orderId ${securityClause}
        `;
        const orderResult = await connection.execute(orderSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Commande non trouvée ou accès refusé' });
        }

        const order = orderResult.rows[0];

        // Get items
        const itemsSql = `
            SELECT i.*, p.PRODUCT_NAME as NOM_PRODUIT, p.PRIX_UNITAIRE, p.UNIT, (i.QUANTITY * p.PRIX_UNITAIRE) as TOTAL_LINE
            FROM ORDER_ITEMS i
            JOIN PRODUCTS p ON i.PRODUCT_ID = p.PRODUCT_ID
            WHERE i.ORDER_ID = :orderId
        `;
        const itemsResult = await connection.execute(itemsSql, [orderId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const items = itemsResult.rows;

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=BC-${order.ORDER_NUMBER}.pdf`);

        doc.pipe(res);

        let y = addHeader(doc, 'BON DE COMMANDE');

        // Order Info
        doc.fontSize(10).fillColor('#333');
        doc.text(`N° Commande: ${order.ORDER_NUMBER}`, 50, y);
        doc.text(`Date: ${formatDate(order.CREATED_AT)}`, 50, y + 15);
        doc.text(`Statut: ${order.STATUS}`, 50, y + 30);

        // Client Info
        y += 65;
        doc.fontSize(12).fillColor('#16a34a').text('CLIENT', 50, y);
        y += 20;
        doc.fontSize(10).fillColor('#333');
        doc.text(order.ENTREPRISE || `${order.NOM_CLIENT} ${order.PRENOM || ''}`, 50, y);
        if (order.ADRESSE) doc.text(order.ADRESSE, 50, y + 15);
        if (order.VILLE) doc.text(`${order.CODE_POSTAL || ''} ${order.VILLE}`, 50, y + 30);
        if (order.TEL) doc.text(`Tél: ${order.TEL}`, 50, y + 45);
        if (order.EMAIL) doc.text(`Email: ${order.EMAIL}`, 50, y + 60);

        // Table Header
        y += 100;
        doc.rect(50, y, 500, 25).fill('#f9fafb');
        doc.fontSize(10).fillColor('#374151').font('Helvetica-Bold');
        doc.text('Produit', 60, y + 8);
        doc.text('Quantité', 220, y + 8);
        doc.text('Prix Unit.', 310, y + 8);
        doc.text('Total', 480, y + 8, { align: 'right' });

        // Table Rows
        y += 30;
        doc.font('Helvetica').fillColor('#4b5563');
        items.forEach((item, i) => {
            if (y > 700) { doc.addPage(); y = 50; }
            doc.text(item.NOM_PRODUIT, 60, y);
            doc.text(`${item.QUANTITY} ${item.UNIT || ''}`, 220, y);
            doc.text(formatCurrency(item.PRIX_UNITAIRE), 310, y);
            doc.text(formatCurrency(item.TOTAL_LINE), 480, y, { align: 'right' });
            y += 20;
        });

        // Totals
        y += 20;
        doc.moveTo(300, y).lineTo(550, y).strokeColor('#eee').stroke();
        y += 10;
        doc.fontSize(12).fillColor('#111827').font('Helvetica-Bold');
        doc.text('TOTAL TTC:', 350, y);
        doc.text(formatCurrency(order.TOTAL_TTC), 480, y, { align: 'right' });

        // Footer
        doc.fontSize(8).fillColor('#999').text('AgriMart - Ce document tient lieu de bon de commande officiel.', 50, 750, { align: 'center' });

        doc.end();

    } catch (err) {
        console.error('PDF Error:', err);
        res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.getDeliveryNotePdf = async (req, res) => {
    const blId = req.params.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();

        let securityClause = '';
        const binds = { blId };

        if (req.user) { // Client
            securityClause = 'AND bl.CLIENT_ID = :clientId';
            binds.clientId = req.user.id;
        } else if (req.agent) { // Agent
            securityClause = 'AND c.APPROVED_BY_AGENT = :agentId';
            binds.agentId = req.agent.id;
        } else {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        // Get BL with client info
        const blSql = `
            SELECT bl.*, c.NOM_CLIENT, c.PRENOM, c.ENTREPRISE,
                   c.ADRESSE, c.VILLE, c.CODE_POSTAL, c.TEL, c.EMAIL,
                   o.ORDER_NUMBER
            FROM DELIVERY_NOTES bl
            JOIN CLIENTS c ON bl.CLIENT_ID = c.ID
            JOIN ORDERS o ON bl.ORDER_ID = o.ID
            WHERE bl.ID = :blId ${securityClause}
        `;
        const blResult = await connection.execute(blSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (blResult.rows.length === 0) {
            return res.status(404).json({ message: 'Bon de Livraison non trouvé' });
        }

        const bl = blResult.rows[0];

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${bl.BL_NUMBER}.pdf`);

        doc.pipe(res);

        let y = addHeader(doc, 'BON DE LIVRAISON');

        // Document info
        doc.fontSize(10).fillColor('#333');
        doc.text(`N° Livraison: ${bl.BL_NUMBER}`, 50, y);
        doc.text(`Date de Livraison: ${formatDate(bl.DELIVERY_DATE)}`, 50, y + 15);
        doc.text(`Réf Commande: ${bl.ORDER_NUMBER}`, 50, y + 30);

        // Client info
        y += 65;
        doc.fontSize(12).fillColor('#16a34a').text('DESTINATAIRE', 50, y);
        y += 20;
        doc.fontSize(10).fillColor('#333');
        doc.text(bl.ENTREPRISE || `${bl.NOM_CLIENT} ${bl.PRENOM || ''}`, 50, y);
        if (bl.ADRESSE) doc.text(bl.ADRESSE, 50, y + 15);
        if (bl.VILLE) doc.text(`${bl.CODE_POSTAL || ''} ${bl.VILLE}`, 50, y + 30);

        // Get Items
        const itemsSql = `
            SELECT dni.*, p.UNIT
            FROM DELIVERY_NOTE_ITEMS dni
            JOIN PRODUCTS p ON dni.PRODUCT_ID = p.PRODUCT_ID
            WHERE dni.DELIVERY_NOTE_ID = :blId
        `;
        const itemsRes = await connection.execute(itemsSql, [blId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const items = itemsRes.rows;

        // Table Header
        y += 100;
        doc.fontSize(10).fillColor('#333').font('Helvetica-Bold');
        doc.text('Produit', 60, y);
        doc.text('Quantité Livrée', 350, y, { align: 'right' });

        // Table Rows
        y += 20;
        doc.font('Helvetica');
        items.forEach(item => {
            if (y > 700) { doc.addPage(); y = 50; } // Add page if content overflows
            doc.text(item.PRODUCT_NAME, 60, y);
            doc.text(`${item.QUANTITY_DELIVERED} ${item.UNIT || ''}`, 350, y, { align: 'right' });
            y += 20;
        });

        y += 20;
        doc.fontSize(10).fillColor('#666').text('Veuillez vérifier la conformité des articles à la réception.', 50, y);
        y += 20;
        doc.fontSize(10).fillColor('#666').text('Veuillez vérifier la conformité des articles à la réception.', 50, y);

        // Footer
        doc.fontSize(8).fillColor('#999').text('Signature Client ____________________        Cachet AgriMart ____________________', 50, 700);
        doc.text('AgriMart - Document de transport et de livraison.', 50, 750, { align: 'center' });

        doc.end();

    } catch (err) {
        console.error('PDF Error:', err);
        res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.getInvoicePdf = async (req, res) => {
    const invoiceId = req.params.id;
    const type = (req.query.type || 'regular').toUpperCase();

    let connection;
    try {
        connection = await db.getPool().getConnection();

        const table = type === 'MONTHLY' ? 'MONTHLY_INVOICES' : 'ORDER_INVOICES';

        let securityClause = '';
        const binds = { invoiceId };

        if (req.user) { // Client
            securityClause = 'AND i.CLIENT_ID = :clientId';
            binds.clientId = req.user.id;
        } else if (req.agent) { // Agent
            securityClause = 'AND c.APPROVED_BY_AGENT = :agentId';
            binds.agentId = req.agent.id;
        } else {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        // Get invoice with client info
        const invoiceSql = `
            SELECT i.*, c.NOM_CLIENT, c.PRENOM, c.ENTREPRISE,
                   c.ADRESSE, c.VILLE, c.CODE_POSTAL, c.TEL, c.EMAIL
            FROM ${table} i
            JOIN CLIENTS c ON i.CLIENT_ID = c.ID
            WHERE i.ID = :invoiceId ${securityClause}
        `;
        const invoiceResult = await connection.execute(invoiceSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({ message: 'Facture non trouvée' });
        }

        const invoice = invoiceResult.rows[0];

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${invoice.INVOICE_NUMBER}.pdf`);

        doc.pipe(res);

        let y = addHeader(doc, type === 'MONTHLY' ? 'FACTURE MENSUELLE' : 'FACTURE');

        // Document info
        doc.fontSize(10).fillColor('#333');
        doc.text(`N° Facture: ${invoice.INVOICE_NUMBER}`, 50, y);
        doc.text(`Date d'émission: ${formatDate(invoice.CREATED_AT)}`, 50, y + 15);
        doc.text(`Date d'échéance: ${formatDate(invoice.DUE_DATE)}`, 50, y + 30);
        doc.text(`Statut: ${invoice.STATUS === 'PAID' ? 'PAYÉE' : 'NON PAYÉE'}`, 50, y + 45);

        // Client info
        y += 85;
        doc.fontSize(12).fillColor('#16a34a').text('FACTURÉ À', 50, y);
        y += 20;
        doc.fontSize(10).fillColor('#333');
        doc.text(invoice.ENTREPRISE || `${invoice.NOM_CLIENT} ${invoice.PRENOM || ''}`, 50, y);
        if (invoice.ADRESSE) doc.text(invoice.ADRESSE, 50, y + 15);
        if (invoice.VILLE) doc.text(`${invoice.CODE_POSTAL || ''} ${invoice.VILLE}`, 50, y + 30);
        if (invoice.TEL) doc.text(`Tél: ${invoice.TEL}`, 50, y + 45);
        if (invoice.EMAIL) doc.text(`Email: ${invoice.EMAIL}`, 50, y + 60);

        // Totals box
        y += 120;
        doc.rect(300, y, 250, 130).fill('#f0fdf4').stroke('#16a34a');

        y += 20;
        doc.fontSize(11).fillColor('#333');
        const deliveryFee = 50;
        const productsHt = invoice.TOTAL_HT - deliveryFee;

        doc.text('Total HT (Produits):', 320, y);
        doc.text(formatCurrency(productsHt), 450, y, { width: 80, align: 'right' });

        y += 25;
        doc.text('Frais Livraison (Fixe):', 320, y);
        doc.text(formatCurrency(deliveryFee), 450, y, { width: 80, align: 'right' });

        y += 25;
        doc.text('TVA (20%):', 320, y);
        doc.text(formatCurrency(invoice.TOTAL_TVA), 450, y, { width: 80, align: 'right' });

        y += 25;
        doc.fontSize(14).fillColor('#16a34a');
        doc.text('Total TTC:', 320, y);
        doc.text(formatCurrency(invoice.TOTAL_TTC), 450, y, { width: 80, align: 'right' });

        // Footer
        doc.fontSize(8).fillColor('#999').text('AgriMart - Document généré automatiquement', 50, 750, { align: 'center' });

        doc.end();

    } catch (err) {
        console.error('PDF Error:', err);
        res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
    } finally {
        if (connection) await connection.close();
    }
};

// ============================================
// CLIENT DOCUMENTS LIST
// ============================================

exports.getClientDocuments = async (req, res) => {
    const clientId = parseInt(req.user.id);
    console.log(`[DEBUG] getClientDocuments START - clientId: ${clientId}`);

    let connection;
    try {
        connection = await db.getPool().getConnection();

        // 1. Get orders
        const ordersSql = `
            SELECT ID, ORDER_NUMBER, CREATED_AT, STATUS, TOTAL_TTC
            FROM ORDERS 
            WHERE CLIENT_ID = :clientId
            ORDER BY CREATED_AT DESC
        `;
        const ordersRes = await connection.execute(ordersSql, [clientId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log(`[DEBUG] getClientDocuments - Found ${ordersRes.rows.length} orders`);

        // 2. Get delivery notes (joined with orders for ORDER_NUMBER)
        const blSql = `
            SELECT dn.ID, dn.BL_NUMBER, dn.DELIVERY_DATE, dn.DELIVERY_STATUS, o.ORDER_NUMBER
            FROM DELIVERY_NOTES dn
            JOIN ORDERS o ON dn.ORDER_ID = o.ID
            WHERE dn.CLIENT_ID = :clientId
            ORDER BY dn.DELIVERY_DATE DESC
        `;
        const blRes = await connection.execute(blSql, [clientId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log(`[DEBUG] getClientDocuments - Found ${blRes.rows.length} delivery notes`);

        // 3. Get invoices (regular only as requested)
        const invoicesSql = `
            SELECT i.ID, i.INVOICE_NUMBER, i.CREATED_AT as EMISSION_DATE, i.DUE_DATE, i.TOTAL_TTC, i.STATUS, 'REGULAR' as TYPE
            FROM ORDER_INVOICES i
            WHERE i.CLIENT_ID = :clientId
            ORDER BY i.CREATED_AT DESC
        `;
        const invRes = await connection.execute(invoicesSql, { clientId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log(`[DEBUG] getClientDocuments - Found ${invRes.rows.length} invoices`);

        res.json({
            orders: ordersRes.rows,
            deliveryNotes: blRes.rows,
            invoices: invRes.rows
        });

    } catch (err) {
        console.error('[ERROR] getClientDocuments failed:', err);
        res.status(500).json({ message: 'Erreur lors de la récupération des documents' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.payInvoice = async (req, res) => {
    const invoiceId = req.params.id;
    const clientId = req.user.id;
    let connection;

    try {
        connection = await db.getPool().getConnection();

        // 1. Verify ownership and status
        const checkSql = `SELECT id, status FROM order_invoices WHERE id = :id AND client_id = :clientId`;
        const checkRes = await connection.execute(checkSql, [invoiceId, clientId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ message: 'Facture non trouvée' });
        }

        const invoice = checkRes.rows[0];
        if (invoice.STATUS === 'PAID') {
            return res.status(400).json({ message: 'Cette facture est déjà payée' });
        }

        // 2. Update status to PAID
        await connection.execute(
            `UPDATE order_invoices SET status = 'PAID' WHERE id = :id`,
            [invoiceId],
            { autoCommit: true }
        );

        res.json({ message: 'Paiement effectué avec succès' });

    } catch (err) {
        console.error('[ERROR] payInvoice failed:', err);
        res.status(500).json({ message: 'Erreur lors du traitement du paiement' });
    } finally {
        if (connection) await connection.close();
    }
};
