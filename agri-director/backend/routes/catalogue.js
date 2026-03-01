const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/catalogue - Liste des produits avec pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';

        let whereClause = "WHERE 1=1";
        const binds = {};

        if (search) {
            whereClause += " AND (UPPER(product_name) LIKE UPPER(:search) OR UPPER(product_code) LIKE UPPER(:search))";
            binds.search = `%${search}%`;
        }
        if (category) {
            whereClause += " AND category = :category";
            binds.category = category;
        }

        // Count total
        const countResult = await db.execute(
            `SELECT COUNT(*) as total FROM products ${whereClause}`,
            binds
        );

        // Get products
        const result = await db.execute(`
            SELECT product_id, product_code, product_name, description, category, 
                   unit, prix_unitaire, stock_disponible, stock_minimum, 
                   is_active, created_at, updated_at
            FROM products 
            ${whereClause}
            ORDER BY product_name
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

// GET /api/catalogue/categories - Liste des catégories
router.get('/categories', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT DISTINCT category, COUNT(*) as count
            FROM products
            GROUP BY category
            ORDER BY category
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/catalogue/:id - Détails d'un produit
router.get('/:id', async (req, res) => {
    try {
        const result = await db.execute(
            `SELECT * FROM products WHERE product_id = :id`,
            { id: req.params.id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Produit non trouvé' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/catalogue - Ajouter un produit
router.post('/', async (req, res) => {
    try {
        const { product_code, product_name, description, category, unit, prix_unitaire, stock_disponible, stock_minimum } = req.body;

        const result = await db.execute(`
            INSERT INTO products (product_code, product_name, description, category, unit, prix_unitaire, stock_disponible, stock_minimum, is_active)
            VALUES (:product_code, :product_name, :description, :category, :unit, :prix_unitaire, :stock_disponible, :stock_minimum, 'Y')
            RETURNING product_id INTO :id
        `, {
            product_code: product_code || null,
            product_name,
            description: description || null,
            category,
            unit: unit || 'KG',
            prix_unitaire,
            stock_disponible: stock_disponible || 0,
            stock_minimum: stock_minimum || 10,
            id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER }
        });

        res.json({
            success: true,
            message: 'Produit ajouté avec succès',
            productId: result.outBinds.id[0]
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/catalogue/:id - Modifier un produit
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;

        // Récupérer le produit existant pour préserver les valeurs non-nulles
        const existing = await db.execute(
            `SELECT * FROM products WHERE product_id = :id`,
            { id }
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Produit non trouvé' });
        }

        const current = existing.rows[0];
        const body = req.body;

        // Fusionner avec les valeurs existantes (préserver les valeurs non-nulles)
        const product_name = body.product_name || current.PRODUCT_NAME;
        const description = body.description !== undefined ? body.description : current.DESCRIPTION;
        const category = body.category || current.CATEGORY;
        const unit = body.unit || current.UNIT || 'KG';
        const prix_unitaire = body.prix_unitaire !== undefined ? body.prix_unitaire : current.PRIX_UNITAIRE;
        const stock_disponible = body.stock_disponible !== undefined ? body.stock_disponible : current.STOCK_DISPONIBLE;
        const stock_minimum = body.stock_minimum !== undefined ? body.stock_minimum : current.STOCK_MINIMUM;
        const is_active = body.is_active || current.IS_ACTIVE || 'Y';

        // Validation des champs requis
        if (!product_name) {
            return res.status(400).json({ success: false, error: 'Le nom du produit est requis' });
        }
        if (!category) {
            return res.status(400).json({ success: false, error: 'La catégorie est requise' });
        }

        await db.execute(`
            UPDATE products SET
                product_name = :product_name,
                description = :description,
                category = :category,
                unit = :unit,
                prix_unitaire = :prix_unitaire,
                stock_disponible = :stock_disponible,
                stock_minimum = :stock_minimum,
                is_active = :is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE product_id = :id
        `, {
            product_name,
            description,
            category,
            unit,
            prix_unitaire,
            stock_disponible,
            stock_minimum,
            is_active,
            id
        });

        res.json({ success: true, message: 'Produit mis à jour avec succès' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/catalogue/:id - Supprimer (désactiver) un produit
router.delete('/:id', async (req, res) => {
    try {
        await db.execute(
            `UPDATE products SET is_active = 'N', updated_at = CURRENT_TIMESTAMP WHERE product_id = :id`,
            { id: req.params.id }
        );
        res.json({ success: true, message: 'Produit supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/catalogue/update-prices - Mise à jour groupée des prix
router.post('/update-prices', async (req, res) => {
    try {
        const { updates, version, notes } = req.body;
        // updates = [{ product_id, new_price }, ...]

        let updated = 0;
        for (const item of updates) {
            await db.execute(
                `UPDATE products SET prix_unitaire = :prix, updated_at = CURRENT_TIMESTAMP WHERE product_id = :id`,
                { prix: item.new_price, id: item.product_id }
            );
            updated++;
        }

        // Enregistrer dans l'historique
        await db.execute(`
            INSERT INTO catalogue_history (version, nb_prix_modifies, notes)
            VALUES (:version, :nb_modifies, :notes)
        `, {
            version: version || 'V' + new Date().toISOString().slice(0, 10),
            nb_modifies: updated,
            notes: notes || 'Mise à jour des prix'
        });

        res.json({
            success: true,
            message: `${updated} prix mis à jour`,
            updated
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/catalogue/history - Historique des mises à jour du catalogue
router.get('/history/all', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT * FROM catalogue_history ORDER BY date_mise_a_jour DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
