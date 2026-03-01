const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/clients - Liste des clients avec statistiques
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const type = req.query.type || '';
        const search = req.query.search || '';

        let whereClause = "WHERE role = 'CLIENT' AND status = 'APPROVED'";
        const binds = {};

        if (type) {
            whereClause += " AND type_client = :type";
            binds.type = type;
        }
        if (search) {
            whereClause += " AND (UPPER(nom_client) LIKE UPPER(:search) OR UPPER(email) LIKE UPPER(:search) OR UPPER(entreprise) LIKE UPPER(:search))";
            binds.search = `%${search}%`;
        }

        const countResult = await db.execute(`SELECT COUNT(*) as total FROM clients ${whereClause}`, binds);

        const result = await db.execute(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM order_invoices oi WHERE oi.client_id = c.id) as nb_factures,
                   (SELECT NVL(SUM(total_ttc), 0) FROM order_invoices oi WHERE oi.client_id = c.id AND oi.status = 'PAID') as total_paye,
                   (SELECT NVL(SUM(total_ttc), 0) FROM order_invoices oi WHERE oi.client_id = c.id AND oi.status IN ('PENDING', 'OVERDUE')) as total_impaye
            FROM clients c
            ${whereClause}
            ORDER BY c.nom_client
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
        console.error('Erreur liste clients:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/clients/stats - Statistiques clients
router.get('/stats', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT 
                COUNT(*) as total_clients,
                SUM(CASE WHEN type_client = 'PARTICULIER' THEN 1 ELSE 0 END) as particuliers,
                SUM(CASE WHEN type_client = 'PROFESSIONNEL' THEN 1 ELSE 0 END) as professionnels,
                SUM(CASE WHEN type_client = 'AGRICULTEUR' THEN 1 ELSE 0 END) as agriculteurs
            FROM clients
            WHERE role = 'CLIENT' AND status = 'APPROVED'
        `);

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/clients/:id - Details d'un client
router.get('/:id', async (req, res) => {
    try {
        const clientResult = await db.execute(`
            SELECT * FROM clients WHERE id = :id
        `, { id: req.params.id });

        if (clientResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client non trouve' });
        }

        // Historique des factures
        const facturesResult = await db.execute(`
            SELECT * FROM order_invoices 
            WHERE client_id = :id
            ORDER BY created_at DESC
        `, { id: req.params.id });

        // Statistiques client
        const statsResult = await db.execute(`
            SELECT 
                COUNT(*) as nb_factures,
                NVL(SUM(total_ttc), 0) as total_facture,
                NVL(SUM(CASE WHEN status = 'PAID' THEN total_ttc ELSE 0 END), 0) as total_paye,
                NVL(SUM(CASE WHEN status IN ('PENDING', 'OVERDUE') THEN total_ttc ELSE 0 END), 0) as total_impaye
            FROM order_invoices
            WHERE client_id = :id
        `, { id: req.params.id });

        res.json({
            success: true,
            data: {
                client: clientResult.rows[0],
                factures: facturesResult.rows,
                stats: statsResult.rows[0]
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/clients/:id - Mise a jour fiche client
router.put('/:id', async (req, res) => {
    try {
        const { date_naissance, tel, adresse, ville, code_postal, email } = req.body;

        let updateFields = [];
        const binds = { id: req.params.id };

        if (date_naissance !== undefined) {
            updateFields.push("date_naissance = TO_DATE(:date_naissance, 'YYYY-MM-DD')");
            binds.date_naissance = date_naissance;
        }
        if (tel !== undefined) {
            updateFields.push("tel = :tel");
            binds.tel = tel;
        }
        if (adresse !== undefined) {
            updateFields.push("adresse = :adresse");
            binds.adresse = adresse;
        }
        if (ville !== undefined) {
            updateFields.push("ville = :ville");
            binds.ville = ville;
        }
        if (code_postal !== undefined) {
            updateFields.push("code_postal = :code_postal");
            binds.code_postal = code_postal;
        }
        if (email !== undefined) {
            updateFields.push("email = :email");
            binds.email = email;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ success: false, error: 'Aucun champ a mettre a jour' });
        }

        await db.execute(`
            UPDATE clients SET ${updateFields.join(', ')} WHERE id = :id
        `, binds);

        res.json({ success: true, message: 'Fiche client mise a jour' });
    } catch (err) {
        console.error('Erreur update client:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/clients/:id/bons-livraison - BL d'un client
router.get('/:id/bons-livraison', async (req, res) => {
    try {
        const month = req.query.month;
        const year = req.query.year;

        let whereClause = "WHERE dn.client_id = :clientId";
        const binds = { clientId: req.params.id };

        if (month && year) {
            whereClause += " AND EXTRACT(MONTH FROM dn.created_at) = :month AND EXTRACT(YEAR FROM dn.created_at) = :year";
            binds.month = parseInt(month);
            binds.year = parseInt(year);
        }

        const result = await db.execute(`
            SELECT dn.*, 
                   (SELECT NVL(SUM(dni.quantity_delivered * p.prix_unitaire), 0)
                    FROM delivery_note_items dni
                    JOIN products p ON dni.product_id = p.product_id
                    WHERE dni.delivery_note_id = dn.id) as total_bl
            FROM delivery_notes dn
            ${whereClause}
            ORDER BY dn.created_at DESC
        `, binds);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
