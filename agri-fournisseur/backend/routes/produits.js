const express = require('express');
const router = express.Router();
const db = require('../config/database');
const oracledb = require('oracledb');

// GET /api/produits - Liste des produits du fournisseur
router.get('/', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';

        let whereClause = 'WHERE fournisseur_id = :fournisseurId AND is_active = \'Y\'';
        let binds = { fournisseurId };

        if (search) {
            whereClause += ' AND (UPPER(product_name) LIKE UPPER(:search) OR UPPER(product_code) LIKE UPPER(:search))';
            binds.search = `%${search}%`;
        }

        if (category) {
            whereClause += ' AND category = :category';
            binds.category = category;
        }

        // Compte total
        const countResult = await db.execute(`
            SELECT COUNT(*) as total FROM products ${whereClause}
        `, binds);

        // Liste paginée
        const result = await db.execute(`
            SELECT product_id, product_code, product_name, description, category, unit,
                   prix_unitaire, stock_disponible, stock_minimum, image_url, is_active,
                   created_at, updated_at
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

// GET /api/produits/categories - Liste des catégories disponibles
router.get('/categories', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT DISTINCT category, COUNT(*) as count
            FROM products
            WHERE is_active = 'Y'
            GROUP BY category
            ORDER BY category
        `);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/produits/:id - Détail d'un produit
router.get('/:id', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT * FROM products WHERE product_id = :id
        `, { id: req.params.id });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Produit non trouvé' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST /api/produits - Ajouter un produit
router.post('/', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];
        const { product_code, product_name, description, category, unit, prix_unitaire, stock_disponible, stock_minimum, image_url } = req.body;

        if (!product_name || !category || !prix_unitaire) {
            return res.status(400).json({ success: false, error: 'Champs requis manquants (nom, catégorie, prix)' });
        }

        const result = await db.execute(`
            INSERT INTO products (product_code, product_name, description, category, unit, prix_unitaire, 
                                  stock_disponible, stock_minimum, fournisseur_id, image_url, is_active)
            VALUES (:product_code, :product_name, :description, :category, :unit, :prix_unitaire,
                    :stock_disponible, :stock_minimum, :fournisseur_id, :image_url, 'Y')
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
            fournisseur_id: fournisseurId,
            image_url: image_url || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
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

// PUT /api/produits/:id - Modifier un produit
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const fournisseurId = req.headers['x-fournisseur-id'];

        // Vérifier que le produit appartient au fournisseur
        const existing = await db.execute(
            `SELECT * FROM products WHERE product_id = :id AND fournisseur_id = :fournisseurId`,
            { id, fournisseurId }
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Produit non trouvé ou non autorisé' });
        }

        const current = existing.rows[0];
        const body = req.body;

        // Fusionner avec les valeurs existantes
        const product_name = body.product_name || current.PRODUCT_NAME;
        const description = body.description !== undefined ? body.description : current.DESCRIPTION;
        const category = body.category || current.CATEGORY;
        const unit = body.unit || current.UNIT;
        const prix_unitaire = body.prix_unitaire !== undefined ? body.prix_unitaire : current.PRIX_UNITAIRE;
        const stock_disponible = body.stock_disponible !== undefined ? body.stock_disponible : current.STOCK_DISPONIBLE;
        const stock_minimum = body.stock_minimum !== undefined ? body.stock_minimum : current.STOCK_MINIMUM;
        const image_url = body.image_url !== undefined ? body.image_url : current.IMAGE_URL;

        await db.execute(`
            UPDATE products SET
                product_name = :product_name,
                description = :description,
                category = :category,
                unit = :unit,
                prix_unitaire = :prix_unitaire,
                stock_disponible = :stock_disponible,
                stock_minimum = :stock_minimum,
                image_url = :image_url,
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
            image_url,
            id
        });

        res.json({ success: true, message: 'Produit mis à jour avec succès' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE /api/produits/:id - Supprimer (désactiver) un produit
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const fournisseurId = req.headers['x-fournisseur-id'];

        await db.execute(`
            UPDATE products SET is_active = 'N', updated_at = CURRENT_TIMESTAMP 
            WHERE product_id = :id AND fournisseur_id = :fournisseurId
        `, { id, fournisseurId });

        res.json({ success: true, message: 'Produit supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT /api/produits/:id/stock - Mettre à jour le stock
router.put('/:id/stock', async (req, res) => {
    try {
        const id = req.params.id;
        const { stock_disponible, operation } = req.body;

        if (operation === 'add') {
            await db.execute(`
                UPDATE products SET 
                    stock_disponible = stock_disponible + :qty,
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_id = :id
            `, { qty: stock_disponible, id });
        } else if (operation === 'set') {
            await db.execute(`
                UPDATE products SET 
                    stock_disponible = :qty,
                    updated_at = CURRENT_TIMESTAMP
                WHERE product_id = :id
            `, { qty: stock_disponible, id });
        }

        res.json({ success: true, message: 'Stock mis à jour' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
