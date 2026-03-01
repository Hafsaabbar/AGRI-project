const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/factures - Liste des factures (order_invoices)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || '';
        const search = req.query.search || '';

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

        // Count total
        const countResult = await db.execute(
            `SELECT COUNT(*) as total FROM order_invoices f 
             JOIN clients c ON f.client_id = c.id ${whereClause}`,
            binds
        );

        // Get factures with client info
        const result = await db.execute(`
            SELECT f.*, c.nom_client, c.prenom, c.entreprise, c.type_client, c.email, c.tel,
                   o.order_number
            FROM order_invoices f
            JOIN clients c ON f.client_id = c.id
            LEFT JOIN orders o ON f.order_id = o.id
            ${whereClause}
            ORDER BY f.created_at DESC
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
        const result = await db.execute(`
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
                global: result.rows[0],
                moisEnCours: currentMonthResult.rows[0]
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/factures/:id - Détails d'une facture
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
            return res.status(404).json({ success: false, error: 'Facture non trouvée' });
        }

        const facture = factureResult.rows[0];

        // Détails de la commande associée
        let orderItems = [];
        if (facture.ORDER_ID) {
            const itemsResult = await db.execute(`
                SELECT oi.*, p.product_name, p.product_code
                FROM order_items oi
                JOIN products p ON oi.product_id = p.product_id
                WHERE oi.order_id = :order_id
            `, { order_id: facture.ORDER_ID });
            orderItems = itemsResult.rows;
        }

        // Bon de livraison associé
        let bonLivraison = null;
        if (facture.ORDER_ID) {
            const blResult = await db.execute(`
                SELECT dn.*, 
                    (SELECT SUM(dni.quantity_delivered * p.prix_unitaire) 
                     FROM delivery_note_items dni 
                     JOIN products p ON dni.product_id = p.product_id 
                     WHERE dni.delivery_note_id = dn.id) as total_bl
                FROM delivery_notes dn
                WHERE dn.order_id = :order_id
            `, { order_id: facture.ORDER_ID });
            if (blResult.rows.length > 0) {
                bonLivraison = blResult.rows[0];
            }
        }

        res.json({
            success: true,
            data: {
                facture: facture,
                orderItems: orderItems,
                bonLivraison: bonLivraison
            }
        });
    } catch (err) {
        console.error('Erreur détails facture:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/factures/:id/status - Changer le statut d'une facture
router.put('/:id/status', async (req, res) => {
    try {
        const { status, payment_method } = req.body;

        await db.execute(`UPDATE order_invoices SET status = :status WHERE id = :id`,
            { status, id: req.params.id });

        // Si payée, créer l'écriture au journal des ventes (le lendemain)
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
                libelle: `Facture ${facture.INVOICE_NUMBER} - Paiement reçu`,
                montant_ht: facture.TOTAL_HT,
                montant_tva: facture.TOTAL_TVA,
                montant_ttc: facture.TOTAL_TTC
            });
        }

        res.json({ success: true, message: 'Statut mis à jour' });
    } catch (err) {
        console.error('Erreur update status:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/factures - Créer une nouvelle facture
router.post('/', async (req, res) => {
    try {
        const { order_id, client_id, total_ht, total_tva, total_ttc, due_date } = req.body;
        const oracledb = require('oracledb');

        const result = await db.execute(`
            INSERT INTO order_invoices (order_id, client_id, total_ht, total_tva, total_ttc, status, due_date)
            VALUES (:order_id, :client_id, :total_ht, :total_tva, :total_ttc, 'PENDING', TO_DATE(:due_date, 'YYYY-MM-DD'))
            RETURNING id INTO :id
        `, {
            order_id: order_id || null,
            client_id,
            total_ht,
            total_tva,
            total_ttc,
            due_date: due_date || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        });

        res.json({
            success: true,
            message: 'Facture créée',
            factureId: result.outBinds.id[0]
        });
    } catch (err) {
        console.error('Erreur création facture:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/factures/:id - Annuler une facture
router.delete('/:id', async (req, res) => {
    try {
        await db.execute(`
            UPDATE order_invoices SET status = 'CANCELLED' WHERE id = :id
        `, { id: req.params.id });

        res.json({ success: true, message: 'Facture annulée' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
