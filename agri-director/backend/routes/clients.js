const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/clients - Liste des clients avec pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const type = req.query.type || '';
        const status = req.query.status || '';

        let whereClause = "WHERE role = 'CLIENT'";
        const binds = {};

        if (search) {
            whereClause += " AND (UPPER(nom_client) LIKE UPPER(:search) OR UPPER(email) LIKE UPPER(:search) OR UPPER(entreprise) LIKE UPPER(:search))";
            binds.search = `%${search}%`;
        }
        if (type) {
            whereClause += " AND type_client = :type";
            binds.type = type;
        }
        if (status) {
            whereClause += " AND status = :status";
            binds.status = status;
        }

        // Count total
        const countResult = await db.execute(
            `SELECT COUNT(*) as total FROM clients ${whereClause}`,
            binds
        );

        // Get clients
        const result = await db.execute(`
            SELECT id, email, nom_client, prenom, entreprise, type_client, 
                   tel, adresse, ville, code_postal, date_naissance, 
                   status, is_eligible, created_at, last_login
            FROM clients 
            ${whereClause}
            ORDER BY nom_client
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
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/clients/stats - Statistiques clients
router.get('/stats', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN type_client = 'PROFESSIONNEL' THEN 1 ELSE 0 END) as professionnels,
                SUM(CASE WHEN type_client = 'PARTICULIER' THEN 1 ELSE 0 END) as particuliers,
                SUM(CASE WHEN type_client = 'AGRICULTEUR' THEN 1 ELSE 0 END) as agriculteurs,
                SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as approuves,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as en_attente,
                SUM(CASE WHEN is_eligible = 'Y' THEN 1 ELSE 0 END) as eligibles_remise
            FROM clients WHERE role = 'CLIENT'
        `);

        // Clients par ville
        const villesResult = await db.execute(`
            SELECT ville, COUNT(*) as count
            FROM clients WHERE role = 'CLIENT' AND ville IS NOT NULL
            GROUP BY ville ORDER BY count DESC
            FETCH FIRST 10 ROWS ONLY
        `);

        // Nouveaux clients ce mois
        const nouveauxResult = await db.execute(`
            SELECT COUNT(*) as count FROM clients 
            WHERE role = 'CLIENT' 
            AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM SYSDATE)
        `);

        res.json({
            success: true,
            data: {
                stats: result.rows[0],
                parVille: villesResult.rows,
                nouveauxCeMois: nouveauxResult.rows[0].COUNT
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/clients/:id - Détails d'un client
router.get('/:id', async (req, res) => {
    try {
        const clientResult = await db.execute(
            `SELECT * FROM clients WHERE id = :id`,
            { id: req.params.id }
        );

        if (clientResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client non trouvé' });
        }

        // Commandes du client
        const ordersResult = await db.execute(`
            SELECT id, order_number, total_ttc, status, created_at
            FROM orders WHERE client_id = :id ORDER BY created_at DESC
            FETCH FIRST 10 ROWS ONLY
        `, { id: req.params.id });

        // Factures du client
        const invoicesResult = await db.execute(`
            SELECT id, invoice_number, total_ttc, status, emission_date
            FROM monthly_invoices WHERE client_id = :id ORDER BY emission_date DESC
            FETCH FIRST 10 ROWS ONLY
        `, { id: req.params.id });

        res.json({
            success: true,
            data: {
                client: clientResult.rows[0],
                commandes: ordersResult.rows,
                factures: invoicesResult.rows
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/clients/:id - Modifier un client
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Récupérer le client existant
        const existing = await db.execute(
            `SELECT * FROM clients WHERE id = :id`,
            { id }
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Client non trouvé' });
        }

        const current = existing.rows[0];
        const body = req.body;

        // Fusionner avec les valeurs existantes
        const nom_client = body.nom_client || current.NOM_CLIENT;
        const prenom = body.prenom !== undefined ? body.prenom : current.PRENOM;
        const entreprise = body.entreprise !== undefined ? body.entreprise : current.ENTREPRISE;
        const type_client = body.type_client || current.TYPE_CLIENT || 'PARTICULIER';
        const tel = body.tel !== undefined ? body.tel : current.TEL;
        const adresse = body.adresse !== undefined ? body.adresse : current.ADRESSE;
        const ville = body.ville !== undefined ? body.ville : current.VILLE;
        const code_postal = body.code_postal !== undefined ? body.code_postal : current.CODE_POSTAL;
        const date_naissance = body.date_naissance !== undefined ? body.date_naissance : null;
        const is_eligible = body.is_eligible || current.IS_ELIGIBLE || 'N';
        const status = body.status || current.STATUS || 'PENDING';

        // Validation
        if (!nom_client) {
            return res.status(400).json({ success: false, error: 'Le nom du client est requis' });
        }

        await db.execute(`
            UPDATE clients SET
                nom_client = :nom_client,
                prenom = :prenom,
                entreprise = :entreprise,
                type_client = :type_client,
                tel = :tel,
                adresse = :adresse,
                ville = :ville,
                code_postal = :code_postal,
                date_naissance = CASE WHEN :date_naissance IS NOT NULL THEN TO_DATE(:date_naissance, 'YYYY-MM-DD') ELSE date_naissance END,
                is_eligible = :is_eligible,
                status = :status
            WHERE id = :id
        `, {
            nom_client,
            prenom,
            entreprise,
            type_client,
            tel,
            adresse,
            ville,
            code_postal,
            date_naissance,
            is_eligible,
            status,
            id
        });

        res.json({ success: true, message: 'Client mis à jour avec succès' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/clients/:id/status - Changer le statut
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        await db.execute(`
            UPDATE clients SET status = :status, approved_at = CASE WHEN :status = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE approved_at END
            WHERE id = :id
        `, { status, id: req.params.id });

        res.json({ success: true, message: 'Statut mis à jour' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/clients/birthdays/upcoming - Anniversaires à venir (pour actions publicitaires)
router.get('/birthdays/upcoming', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT id, nom_client, prenom, email, tel, date_naissance, type_client
            FROM clients 
            WHERE role = 'CLIENT' 
            AND date_naissance IS NOT NULL
            AND TO_CHAR(date_naissance, 'MMDD') BETWEEN TO_CHAR(SYSDATE, 'MMDD') AND TO_CHAR(SYSDATE + 30, 'MMDD')
            ORDER BY TO_CHAR(date_naissance, 'MMDD')
        `);

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
