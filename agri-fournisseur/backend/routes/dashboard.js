const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/dashboard/stats - Statistiques du fournisseur
router.get('/stats', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];

        if (!fournisseurId) {
            return res.status(401).json({ success: false, error: 'Non authentifié' });
        }

        // Nombre de produits du fournisseur
        const produitsResult = await db.execute(`
            SELECT COUNT(*) as total 
            FROM products 
            WHERE fournisseur_id = :id AND is_active = 'Y'
        `, { id: fournisseurId });

        // Nombre de bons de livraison ce mois
        const livraisonsResult = await db.execute(`
            SELECT COUNT(*) as total 
            FROM delivery_notes dn
            JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
            JOIN products p ON dni.product_id = p.product_id
            WHERE p.fournisseur_id = :id
            AND EXTRACT(MONTH FROM dn.created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM dn.created_at) = EXTRACT(YEAR FROM SYSDATE)
        `, { id: fournisseurId });

        // Chiffre d'affaires ce mois (basé sur les produits livrés)
        const caResult = await db.execute(`
            SELECT NVL(SUM(dni.quantity_delivered * p.prix_unitaire), 0) as total
            FROM delivery_notes dn
            JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
            JOIN products p ON dni.product_id = p.product_id
            WHERE p.fournisseur_id = :id
            AND EXTRACT(MONTH FROM dn.created_at) = EXTRACT(MONTH FROM SYSDATE)
            AND EXTRACT(YEAR FROM dn.created_at) = EXTRACT(YEAR FROM SYSDATE)
        `, { id: fournisseurId });

        // Produits en rupture de stock
        const ruptureResult = await db.execute(`
            SELECT COUNT(*) as total 
            FROM products 
            WHERE fournisseur_id = :id 
            AND is_active = 'Y'
            AND stock_disponible <= stock_minimum
        `, { id: fournisseurId });

        res.json({
            success: true,
            data: {
                produits_actifs: produitsResult.rows[0]?.TOTAL || 0,
                livraisons_mois: livraisonsResult.rows[0]?.TOTAL || 0,
                ca_mois: caResult.rows[0]?.TOTAL || 0,
                produits_rupture: ruptureResult.rows[0]?.TOTAL || 0
            }
        });
    } catch (err) {
        console.error('Erreur stats:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dashboard/recent-products - Derniers produits ajoutés
router.get('/recent-products', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];

        const result = await db.execute(`
            SELECT product_id, product_code, product_name, category, prix_unitaire, stock_disponible
            FROM products
            WHERE fournisseur_id = :id AND is_active = 'Y'
            ORDER BY created_at DESC
            FETCH FIRST 5 ROWS ONLY
        `, { id: fournisseurId });

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/dashboard/recent-deliveries - Dernières livraisons
router.get('/recent-deliveries', async (req, res) => {
    try {
        const fournisseurId = req.headers['x-fournisseur-id'];

        const result = await db.execute(`
            SELECT DISTINCT dn.id, dn.bl_number, dn.delivery_date, dn.delivery_status, c.nom_client
            FROM delivery_notes dn
            JOIN clients c ON dn.client_id = c.id
            JOIN delivery_note_items dni ON dn.id = dni.delivery_note_id
            JOIN products p ON dni.product_id = p.product_id
            WHERE p.fournisseur_id = :id
            ORDER BY dn.created_at DESC
            FETCH FIRST 5 ROWS ONLY
        `, { id: fournisseurId });

        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
