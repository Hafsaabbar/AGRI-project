const oracledb = require('oracledb');
const db = require('../config/db');

exports.getAllProducts = async (req, res) => {
    let connection;
    try {
        connection = await db.getPool().getConnection();

        let sql = `SELECT * FROM products WHERE is_active = 'Y'`;
        const binds = [];

        if (req.query.category) {
            sql += ` AND category = :category`;
            binds.push(req.query.category);
        }

        if (req.query.search) {
            // Case insensitive search
            sql += ` AND UPPER(product_name) LIKE UPPER(:search)`;
            binds.push(`%${req.query.search}%`);
        }

        sql += ` ORDER BY product_name`;

        const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

exports.getProductById = async (req, res) => {
    let connection;
    try {
        connection = await db.getPool().getConnection();

        const sql = `SELECT * FROM products WHERE product_id = :id AND is_active = 'Y'`;
        const result = await connection.execute(sql, [req.params.id], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur lors de la récupération du produit' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};
