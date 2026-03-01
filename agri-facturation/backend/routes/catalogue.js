const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/catalogue - Liste des produits (lecture seule)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;
        const category = req.query.category || '';
        const search = req.query.search || '';

        let whereClause = "WHERE is_active = 'Y'";
        const binds = {};

        if (category) {
            whereClause += " AND category = :category";
            binds.category = category;
        }
        if (search) {
            whereClause += " AND (UPPER(product_name) LIKE UPPER(:search) OR UPPER(product_code) LIKE UPPER(:search))";
            binds.search = `%${search}%`;
        }

        // Count
        const countResult = await db.execute(`SELECT COUNT(*) as total FROM products ${whereClause}`, binds);

        // Get products
        const result = await db.execute(`
            SELECT product_id, product_code, product_name, description, category, unit, prix_unitaire, stock_disponible
            FROM products
            ${whereClause}
            ORDER BY category, product_name
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
        console.error('Erreur liste catalogue:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/catalogue/categories - Liste des categories
router.get('/categories', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT DISTINCT category, COUNT(*) as nb_produits
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

// GET /api/catalogue/:id - Details d'un produit
router.get('/:id', async (req, res) => {
    try {
        const result = await db.execute(`
            SELECT * FROM products WHERE product_id = :id
        `, { id: req.params.id });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Produit non trouve' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
