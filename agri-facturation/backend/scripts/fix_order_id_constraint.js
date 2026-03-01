// Script pour corriger la contrainte ORDER_ID pour permettre les factures mensuelles
const db = require('../config/database');

async function fixOrderIdConstraint() {
    try {
        await db.initialize();
        console.log('Connexion etablie');

        // 1. Verifier la contrainte actuelle sur ORDER_ID
        console.log('\n--- Verification contrainte ORDER_ID ---');
        const colCheck = await db.execute(`
            SELECT column_name, nullable 
            FROM user_tab_columns 
            WHERE table_name = 'ORDER_INVOICES' 
            AND column_name = 'ORDER_ID'
        `);

        console.log('Colonne ORDER_ID:', colCheck.rows[0]);

        if (colCheck.rows[0] && colCheck.rows[0].NULLABLE === 'N') {
            console.log('ORDER_ID est NOT NULL, modification en cours...');

            // Modifier la colonne pour permettre NULL
            await db.execute(`ALTER TABLE order_invoices MODIFY order_id NULL`);
            console.log('ORDER_ID modifie pour accepter NULL');
        } else {
            console.log('ORDER_ID accepte deja NULL');
        }

        // 2. Verifier les colonnes de la table
        console.log('\n--- Structure de ORDER_INVOICES ---');
        const structResult = await db.execute(`
            SELECT column_name, data_type, nullable
            FROM user_tab_columns 
            WHERE table_name = 'ORDER_INVOICES'
            ORDER BY column_id
        `);

        structResult.rows.forEach(col => {
            console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.NULLABLE === 'N' ? 'NOT NULL' : 'NULL'}`);
        });

        console.log('\n=== Correction terminee avec succes ===');

    } catch (err) {
        console.error('Erreur:', err);
    } finally {
        await db.close();
        process.exit(0);
    }
}

fixOrderIdConstraint();
