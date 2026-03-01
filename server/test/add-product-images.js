const db = require('../config/db');
const oracledb = require('oracledb');

async function addImages() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();
        console.log('Connected to database');

        // 1. Check if IMAGE_URL column exists
        try {
            await connection.execute('SELECT image_url FROM products FETCH FIRST 1 ROWS ONLY');
            console.log('IMAGE_URL column already exists.');
        } catch (e) {
            if (e.message.includes('ORA-00904')) {
                // Column not found, add it
                console.log('Adding IMAGE_URL column...');
                await connection.execute('ALTER TABLE products ADD (image_url VARCHAR2(500))');
                console.log('✅ Added IMAGE_URL column');
            } else if (e.message.includes('ORA-00942')) {
                console.error('❌ PRODUCTS table not found');
                return;
            } else {
                throw e;
            }
        }

        // 2. Update all products with a default image URL
        const defaultImage = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000';
        const updateSql = "UPDATE products SET image_url = :url";
        const result = await connection.execute(updateSql, [defaultImage], { autoCommit: true });
        console.log(`✅ Updated ${result.rowsAffected} products with default image URL.`);

        await connection.close();
        await db.close();
        console.log('Job complete!');
    } catch (err) {
        console.error('Error adding images:', err);
    }
}

addImages();
