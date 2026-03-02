const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// ============================================
// AGENT AUTHENTICATION
// ============================================

exports.register = async (req, res) => {
    const { email, password, nom_agent, code_agence } = req.body;

    if (!email || !password || !nom_agent || !code_agence) {
        return res.status(400).json({ message: 'Tous les champs sont requis' });
    }

    let connection;
    try {
        connection = await db.getPool().getConnection();

        // 1. Check if agent exists
        const checkSql = `SELECT id FROM agents WHERE email = :email`;
        const checkResult = await connection.execute(checkSql, [email]);

        if (checkResult.rows.length > 0) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé' });
        }

        // 2. Get Agency ID from Code
        const agencySql = `SELECT id FROM agences WHERE code = :code`;
        const agencyResult = await connection.execute(agencySql, [code_agence], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (agencyResult.rows.length === 0) {
            return res.status(400).json({ message: 'Code agence invalide' });
        }
        const agenceId = agencyResult.rows[0].ID;

        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Insert Agent using correct columns (nom, agence_id)
        const sql = `
            INSERT INTO agents (email, password, nom, agence_id, role)
            VALUES (:email, :password, :nom, :agenceId, 'AGENT')
            RETURNING id INTO :id
        `;

        const result = await connection.execute(sql, {
            email,
            password: hashedPassword,
            nom: nom_agent,
            agenceId,
            id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }, { autoCommit: true });

        const agentId = result.outBinds.id[0];

        const token = jwt.sign({ id: agentId, role: 'AGENT', userType: 'AGENT' }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: 'Agent créé avec succès',
            token,
            agent: { id: agentId, email, nom: nom_agent, role: 'AGENT' }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de l\'inscription de l\'agent' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    let connection;
    try {
        connection = await db.getPool().getConnection();

        const sql = `SELECT id, password, nom, role FROM agents WHERE email = :email`;
        const result = await connection.execute(sql, [email], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const agent = result.rows[0];
        const isMatch = await bcrypt.compare(password, agent.PASSWORD);

        if (!isMatch) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const token = jwt.sign({ id: agent.ID, role: agent.ROLE, userType: 'AGENT' }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Connexion réussie',
            token,
            agent: {
                id: agent.ID,
                email,
                nom: agent.NOM,
                role: agent.ROLE
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    } finally {
        if (connection) await connection.close();
    }
};

// --- Helper for registration form ---
exports.getAgences = async (req, res) => {
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `SELECT code, nom, ville FROM agences ORDER BY nom ASC`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // Map to format expected by frontend { code, region/label }
        const agencies = result.rows.map(row => ({
            code: row.CODE,
            region: `${row.NOM} (${row.VILLE})`
        }));

        res.json(agencies);
    } catch (err) {
        console.error(err);
        // Fallback or error
        res.status(500).json({ message: 'Erreur lors de la récupération des agences' });
    } finally {
        if (connection) await connection.close();
    }
};


// ============================================
// CLIENT MANAGEMENT
// ============================================

exports.getPendingClients = async (req, res) => {
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `SELECT * FROM clients WHERE status = 'PENDING' ORDER BY created_at DESC`;
        const result = await connection.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la récupération des clients en attente' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.approveClient = async (req, res) => {
    const clientId = req.params.id;
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `
            UPDATE clients 
            SET status = 'APPROVED', approved_by_agent = :agentId 
            WHERE id = :clientId
        `;
        await connection.execute(sql, { agentId, clientId }, { autoCommit: true });
        res.json({ message: 'Client approuvé avec succès' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de l\'approbation du client' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.rejectClient = async (req, res) => {
    const clientId = req.params.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `UPDATE clients SET status = 'REJECTED' WHERE id = :clientId`;
        await connection.execute(sql, { clientId }, { autoCommit: true });
        res.json({ message: 'Client rejeté' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors du rejet du client' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.getMyClients = async (req, res) => {
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `SELECT * FROM clients WHERE approved_by_agent = :agentId ORDER BY nom_client ASC`;
        const result = await connection.execute(sql, [agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la récupération de vos clients' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.deleteClient = async (req, res) => {
    const clientId = req.params.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();
        await connection.execute(`DELETE FROM clients WHERE id = :clientId`, [clientId], { autoCommit: true });
        res.json({ message: 'Client supprimé' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la suppression du client' });
    } finally {
        if (connection) await connection.close();
    }
};


// ============================================
// ORDER MANAGEMENT
// ============================================

exports.getOrders = async (req, res) => {
    const agentId = req.agent.id;
    const status = req.query.status;

    let connection;
    try {
        connection = await db.getPool().getConnection();

        let sql = `
            SELECT o.*, c.NOM_CLIENT, c.ENTREPRISE,
            (SELECT ID FROM ORDER_INVOICES WHERE ORDER_ID = o.ID) as INVOICE_ID
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            WHERE c.approved_by_agent = :agentId
        `;
        const binds = { agentId };

        if (status) {
            sql += ` AND o.status = :status`;
            binds.status = status;
        }

        sql += ` ORDER BY o.created_at DESC`;

        const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la récupération des commandes' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.getOrderDetails = async (req, res) => {
    const orderId = req.params.id;
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();

        // Get order info (secured)
        const orderSql = `
            SELECT o.*, c.NOM_CLIENT, c.PRENOM, c.ENTREPRISE, c.TEL, c.EMAIL
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            WHERE o.id = :orderId AND c.approved_by_agent = :agentId
        `;
        const orderRes = await connection.execute(orderSql, [orderId, agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (orderRes.rows.length === 0) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }

        // Get items with product info and current delivery status
        const itemsSql = `
            SELECT i.*, p.PRODUCT_NAME, p.PRIX_UNITAIRE, p.UNIT,
                   (SELECT NVL(SUM(dni.quantity_delivered), 0) 
                    FROM delivery_note_items dni 
                    JOIN delivery_notes dn ON dni.delivery_note_id = dn.id 
                    WHERE dn.order_id = :orderId AND dni.product_id = i.product_id) as QUANTITY_DELIVERED_SO_FAR
            FROM order_items i
            JOIN products p ON i.product_id = p.product_id
            WHERE i.order_id = :orderId
        `;
        const itemsRes = await connection.execute(itemsSql, { orderId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // Get delivery history
        const historySql = `
            SELECT id, bl_number, delivery_date as CREATED_AT, notes 
            FROM delivery_notes 
            WHERE order_id = :orderId
            ORDER BY delivery_date DESC
        `;
        const historyRes = await connection.execute(historySql, [orderId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json({
            ...orderRes.rows[0],
            items: itemsRes.rows,
            deliveryNotes: historyRes.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur' });
    } finally {
        if (connection) await connection.close();
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `
            UPDATE orders o
            SET status = :status 
            WHERE id = :id 
            AND EXISTS (SELECT 1 FROM clients c WHERE c.id = o.client_id AND c.approved_by_agent = :agentId)
        `;
        const result = await connection.execute(sql, { status, id, agentId }, { autoCommit: true });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Commande non trouvée ou non autorisée' });
        }
        res.json({ message: 'Statut mis à jour' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur mise à jour' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.approveOrder = async (req, res) => {
    const orderId = req.params.id;
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `
            UPDATE orders o
            SET status = 'CONFIRMED' 
            WHERE id = :orderId 
            AND EXISTS (SELECT 1 FROM clients c WHERE c.id = o.client_id AND c.approved_by_agent = :agentId)
        `;
        const result = await connection.execute(sql, { orderId, agentId }, { autoCommit: true });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Commande non trouvée ou non autorisée' });
        }

        res.json({ message: 'Commande confirmée' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la confirmation' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.rejectOrder = async (req, res) => {
    const orderId = req.params.id;
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `
            UPDATE orders o
            SET status = 'REJECTED' 
            WHERE id = :orderId
            AND EXISTS (SELECT 1 FROM clients c WHERE c.id = o.client_id AND c.approved_by_agent = :agentId)
        `;
        const result = await connection.execute(sql, { orderId, agentId }, { autoCommit: true });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Commande non trouvée ou non autorisée' });
        }

        res.json({ message: 'Commande rejetée' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors du rejet' });
    } finally {
        if (connection) await connection.close();
    }
};


// ============================================
// DELIVERY NOTES (Bons de Livraison)
// ============================================

exports.createDeliveryNote = async (req, res) => {
    const { orderId, items } = req.body; // items = [{ productId, quantitySent }]
    const agentId = req.agent.id;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'Aucun article spécifié pour la livraison' });
    }

    let connection;
    try {
        connection = await db.getPool().getConnection();

        // 1. Verify Order Ownership & Status
        const orderSql = `
            SELECT o.ID, o.CLIENT_ID, o.STATUS 
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            WHERE o.id = :orderId AND c.approved_by_agent = :agentId
        `;
        const orderRes = await connection.execute(orderSql, [orderId, agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (orderRes.rows.length === 0) {
            return res.status(404).json({ message: 'Commande non trouvée ou non autorisée' });
        }
        const order = orderRes.rows[0];

        // 2. Generate BL Number
        const blNumResult = await connection.execute(
            `SELECT 'BL-' || TO_CHAR(SYSDATE, 'YYYYMM') || '-' || LPAD(NVL(MAX(TO_NUMBER(SUBSTR(bl_number, -4))), 0) + 1, 4, '0') as NEW_NUM
             FROM delivery_notes WHERE bl_number LIKE 'BL-' || TO_CHAR(SYSDATE, 'YYYYMM') || '%'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const blNumber = blNumResult.rows[0].NEW_NUM;

        // 3. Create BL Header
        const insertBlSql = `
            INSERT INTO delivery_notes (bl_number, order_id, client_id, delivery_date, delivery_status)
            VALUES (:blNumber, :orderId, :clientId, CURRENT_TIMESTAMP, 'DELIVERED')
            RETURNING id INTO :id
        `;
        const blResult = await connection.execute(insertBlSql, {
            blNumber, orderId, clientId: order.CLIENT_ID,
            id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }, { autoCommit: false });
        const blId = blResult.outBinds.id[0];

        // 4. Insert BL Items & Check Progress
        // We assume DELIVERY_NOTE_ITEMS (delivery_note_id, product_id, quantity) exists
        // Also need to check total ordered vs total delivered

        let allItemsFullyDelivered = true;

        for (const item of items) {
            // Get product name for snapshot
            const prodRes = await connection.execute(`SELECT product_name FROM products WHERE product_id = :id`, [item.productId]);
            const productName = prodRes.rows.length > 0 ? prodRes.rows[0][0] : 'Unknown';

            // Insert into BL items
            // NOTE: Schema has QUANTITY_DELIVERED, not QUANTITY. Also has PRODUCT_NAME.
            await connection.execute(
                `INSERT INTO delivery_note_items (delivery_note_id, product_id, product_name, quantity_delivered)
                  VALUES (:blId, :productId, :productName, :qty)`,
                {
                    blId,
                    productId: item.productId,
                    productName,
                    qty: item.quantityDelivered || item.quantitySent || 0
                }
            );
        }

        // 5. Calculate Order Status
        // Get all items in order
        const orderItemsSql = `SELECT product_id, quantity FROM order_items WHERE order_id = :orderId`;
        const orderItemsRes = await connection.execute(orderItemsSql, [orderId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const orderItems = orderItemsRes.rows;

        // Get total delivered (including this new BL)
        const totalDeliveredSql = `
            SELECT dni.product_id, SUM(dni.quantity_delivered) as TOTAL_DELIVERED
            FROM delivery_note_items dni
            JOIN delivery_notes dn ON dni.delivery_note_id = dn.id
            WHERE dn.order_id = :orderId
            GROUP BY dni.product_id
        `;
        const deliveredRes = await connection.execute(totalDeliveredSql, [orderId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // Map product_id -> delivered_qty
        const deliveredMap = {};
        deliveredRes.rows.forEach(r => deliveredMap[r.PRODUCT_ID] = r.TOTAL_DELIVERED);

        let isFullyDelivered = true;
        for (const oi of orderItems) {
            const delivered = deliveredMap[oi.PRODUCT_ID] || 0;
            if (delivered < oi.QUANTITY) {
                isFullyDelivered = false;
                break;
            }
        }

        const newStatus = isFullyDelivered ? 'DELIVERED' : 'PARTIAL';

        // 6. Update Order Status
        await connection.execute(
            `UPDATE orders SET status = :status WHERE id = :orderId`,
            { status: newStatus, orderId },
            { autoCommit: false }
        );

        await connection.commit();
        res.status(201).json({ message: 'Bon de livraison créé', blId, blNumber, status: newStatus });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la création du BL (Vérifiez les tables)' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.getDeliveryNotes = async (req, res) => {
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `
            SELECT bl.*, c.NOM_CLIENT, c.ENTREPRISE, o.ORDER_NUMBER
            FROM delivery_notes bl
            JOIN clients c ON bl.client_id = c.id
            JOIN orders o ON bl.order_id = o.id
            WHERE c.approved_by_agent = :agentId
            ORDER BY bl.created_at DESC
        `;
        const result = await connection.execute(sql, [agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la récupération des BL' });
    } finally {
        if (connection) await connection.close();
    }
};


// ============================================
// INVOICES (Factures)
// ============================================

// Create invoice for a fully delivered order
exports.createInvoice = async (req, res) => {
    const { orderId } = req.body;
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();

        // Get order info
        const orderSql = `
            SELECT o.*, c.NOM_CLIENT, c.APPROVED_BY_AGENT
            FROM ORDERS o
            JOIN CLIENTS c ON o.CLIENT_ID = c.ID
            WHERE o.ID = :orderId AND c.approved_by_agent = :agentId
        `;
        const orderResult = await connection.execute(orderSql, [orderId, agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }

        const order = orderResult.rows[0];

        if (order.STATUS !== 'DELIVERED') {
            return res.status(400).json({ message: 'La commande doit être totalement livrée (DELIVERED) pour générer une facture' });
        }

        // Check if invoice already exists
        const checkSql = `SELECT id FROM order_invoices WHERE order_id = :orderId`;
        const checkResult = await connection.execute(checkSql, [orderId]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({ message: 'Une facture existe déjà pour cette commande' });
        }

        // Generate invoice number
        const invoiceNumResult = await connection.execute(
            `SELECT 'FAC-' || TO_CHAR(SYSDATE, 'YYYYMM') || '-' || LPAD(NVL(MAX(TO_NUMBER(SUBSTR(invoice_number, -4))), 0) + 1, 4, '0') as NEW_NUM
             FROM order_invoices WHERE invoice_number LIKE 'FAC-' || TO_CHAR(SYSDATE, 'YYYYMM') || '%'`,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const invoiceNumber = invoiceNumResult.rows[0].NEW_NUM;

        // Create invoice
        const insertSql = `
            INSERT INTO order_invoices (
                invoice_number, order_id, client_id,
                total_ht, total_tva, total_ttc, 
                status, created_at, due_date
            ) VALUES (
                :invoiceNumber, :orderId, :clientId, 
                :totalHt, :totalTva, :totalTtc,
                'UNPAID', CURRENT_TIMESTAMP, SYSDATE + 30
            ) RETURNING id INTO :id
        `;
        const deliveryFee = 50;
        const totalHtWithFee = parseFloat(order.TOTAL_HT) + deliveryFee;
        const totalTtcWithFee = parseFloat(order.TOTAL_TTC) + deliveryFee;

        // --- Removed agency-specific stock deduction ---

        const result = await connection.execute(insertSql, {
            invoiceNumber,
            orderId,
            clientId: order.CLIENT_ID,
            totalHt: totalHtWithFee,
            totalTva: order.TOTAL_HT * 0.2, // Default 20%
            totalTtc: totalTtcWithFee,
            id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }, { autoCommit: true });

        const invoiceId = result.outBinds.id[0];

        res.status(201).json({
            message: 'Facture créée',
            invoiceId,
            invoiceNumber
        });

    } catch (err) {
        console.error('Create invoice error:', err);
        res.status(500).json({ message: 'Erreur lors de la création de la facture' });
    } finally {
        if (connection) await connection.close();
    }
};

// Get invoices
exports.getInvoices = async (req, res) => {
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();

        const sql = `
            SELECT i.ID, i.INVOICE_NUMBER, i.CREATED_AT as EMISSION_DATE, i.STATUS, i.TOTAL_TTC, 
                   c.NOM_CLIENT, c.ENTREPRISE, 'REGULAR' as TYPE
            FROM order_invoices i
            JOIN clients c ON i.client_id = c.id
            WHERE c.approved_by_agent = :agentId
            ORDER BY EMISSION_DATE DESC
        `;

        const result = await connection.execute(sql, { agentId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la récupération des factures' });
    } finally {
        if (connection) await connection.close();
    }
};


// ============================================
// DASHBOARD STATS
// ============================================

exports.getDashboardStats = async (req, res) => {
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();

        // 1. Pending clients count
        const sql1 = `SELECT COUNT(*) as COUNT FROM clients WHERE status = 'PENDING'`;
        const res1 = await connection.execute(sql1, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 2. My clients count
        const sql2 = `SELECT COUNT(*) as COUNT FROM clients WHERE approved_by_agent = :agentId`;
        const res2 = await connection.execute(sql2, [agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 3. Pending orders
        const sql3 = `
            SELECT COUNT(*) as COUNT 
            FROM orders o 
            JOIN clients c ON o.client_id = c.id 
            WHERE c.approved_by_agent = :agentId AND o.status = 'PENDING'
        `;
        const res3 = await connection.execute(sql3, [agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        // 4. Delivered orders ready for invoicing
        const sql4 = `
            SELECT COUNT(*) as COUNT 
            FROM orders o 
            JOIN clients c ON o.client_id = c.id 
            WHERE c.approved_by_agent = :agentId AND o.status = 'DELIVERED'
            AND NOT EXISTS (SELECT 1 FROM order_invoices i WHERE i.order_id = o.id)
        `;
        const res4 = await connection.execute(sql4, [agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json({
            pendingClients: res1.rows[0].COUNT,
            myClients: res2.rows[0].COUNT,
            pendingOrders: res3.rows[0].COUNT,
            readyForInvoicing: res4.rows[0].COUNT
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur dashboard' });
    } finally {
        if (connection) await connection.close();
    }
};

// ============================================
// PDF GENERATION (Agent Side)
// ============================================

const PDFDocument = require('pdfkit');

// Helper to format currency/date (duplicated for now, could be shared util)
const formatCurrency = (amount) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount || 0);
const formatDate = (date) => date ? new Date(date).toLocaleDateString() : '-';
const addHeader = (doc, title) => {
    doc.fontSize(25).fillColor('#16a34a').text('AgriMart', 50, 45);
    doc.fontSize(10).fillColor('#999').text('Plateforme de Gestion Agricole', 50, 75);
    doc.fontSize(20).fillColor('#333').text(title, 350, 50, { align: 'right' });
    doc.moveTo(50, 100).lineTo(550, 100).strokeColor('#eee').stroke();
    return 120;
};

exports.getOrderPdf = async (req, res) => {
    const orderId = req.params.id;
    const agentId = req.agent.id;

    let connection;
    try {
        connection = await db.getPool().getConnection();
        const orderSql = `
            SELECT o.*, c.NOM_CLIENT, c.PRENOM, c.ENTREPRISE, c.ADRESSE, c.VILLE, c.CODE_POSTAL, c.TEL, c.EMAIL
            FROM ORDERS o
            JOIN CLIENTS c ON o.CLIENT_ID = c.ID
            WHERE o.ID = :orderId AND c.approved_by_agent = :agentId
        `;
        const orderResult = await connection.execute(orderSql, [orderId, agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }
        const order = orderResult.rows[0];

        const itemsSql = `
            SELECT i.*, p.PRODUCT_NAME as NOM_PRODUIT, p.PRIX_UNITAIRE, p.UNIT, (i.QUANTITY * p.PRIX_UNITAIRE) as TOTAL_LINE
            FROM ORDER_ITEMS i
            JOIN PRODUCTS p ON i.PRODUCT_ID = p.PRODUCT_ID
            WHERE i.ORDER_ID = :orderId
        `;
        const itemsResult = await connection.execute(itemsSql, [orderId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const items = itemsResult.rows;

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=BC-${order.ORDER_NUMBER}.pdf`);
        doc.pipe(res);

        let y = addHeader(doc, 'BON DE COMMANDE');
        doc.fontSize(10).fillColor('#333').text(`N°: ${order.ORDER_NUMBER}`, 50, y);
        doc.text(`Date: ${formatDate(order.CREATED_AT)}`, 50, y + 15);

        y += 60;
        doc.fontSize(12).fillColor('#16a34a').text('CLIENT', 50, y);
        y += 20;
        doc.fontSize(10).fillColor('#333').text(order.ENTREPRISE || order.NOM_CLIENT, 50, y);

        y += 100;
        doc.fontSize(10).fillColor('#333').font('Helvetica-Bold');
        doc.text('Produit', 60, y);
        doc.text('Qte', 220, y);
        doc.text('Prix Unit.', 310, y);
        doc.text('Total', 480, y, { align: 'right' });

        y += 20;
        doc.font('Helvetica');
        items.forEach(item => {
            doc.text(item.NOM_PRODUIT, 60, y);
            doc.text(`${item.QUANTITY} ${item.UNIT || ''}`, 220, y);
            doc.text(formatCurrency(item.PRIX_UNITAIRE), 310, y);
            doc.text(formatCurrency(item.TOTAL_LINE), 480, y, { align: 'right' });
            y += 20;
        });

        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur PDF' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.getDeliveryNotePdf = async (req, res) => {
    const blId = req.params.id;
    const agentId = req.agent.id;
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const blSql = `
            SELECT bl.*, c.NOM_CLIENT, c.ENTREPRISE
            FROM DELIVERY_NOTES bl
            JOIN CLIENTS c ON bl.CLIENT_ID = c.ID
            WHERE bl.ID = :blId AND c.approved_by_agent = :agentId
        `;
        const blResult = await connection.execute(blSql, [blId, agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (blResult.rows.length === 0) return res.status(404).json({ message: 'BL introuvable' });

        const bl = blResult.rows[0];
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${bl.BL_NUMBER}.pdf`);
        doc.pipe(res);
        addHeader(doc, 'BON DE LIVRAISON');
        doc.fontSize(10).fillColor('#333').text(`N°: ${bl.BL_NUMBER}`, 50, 150);
        // ... rest of the PDF logic
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur PDF' });
    } finally {
        if (connection) await connection.close();
    }
};

exports.getInvoicePdf = async (req, res) => {
    // Similar simplified logic
    const invoiceId = req.params.id;
    const agentId = req.agent.id;
    let connection;
    try {
        connection = await db.getPool().getConnection();
        const sql = `SELECT i.* FROM ORDER_INVOICES i JOIN CLIENTS c ON i.CLIENT_ID = c.ID WHERE i.ID = :id AND c.approved_by_agent = :aid`;
        const resSql = await connection.execute(sql, [invoiceId, agentId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        if (resSql.rows.length === 0) return res.status(404).send('Facture introuvable');

        const inv = resSql.rows[0];
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${inv.INVOICE_NUMBER}.pdf`);
        doc.pipe(res);
        addHeader(doc, 'FACTURE');
        doc.text(`N°: ${inv.INVOICE_NUMBER}`, 50, 150);
        doc.text(`Total TTC: ${formatCurrency(inv.TOTAL_TTC)}`, 50, 170);
        doc.end();
    } catch (err) { console.error(err); res.status(500).send('Erreur PDF'); } finally { if (connection) await connection.close(); }
};
