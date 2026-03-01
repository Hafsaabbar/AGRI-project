// Script pour trouver les contraintes CHECK sur la table FOURNISSEURS
const fs = require('fs');
const db = require('./config/database');

async function checkConstraints() {
    let output = '';
    try {
        await db.initialize();

        // Requête pour voir les contraintes CHECK
        const result = await db.execute(`
            SELECT constraint_name, search_condition
            FROM user_constraints
            WHERE table_name = 'FOURNISSEURS'
            AND constraint_type = 'C'
        `);

        output += '\n=== Contraintes CHECK sur FOURNISSEURS ===\n\n';
        result.rows.forEach(row => {
            output += `${row.CONSTRAINT_NAME}:\n`;
            output += `  ${row.SEARCH_CONDITION}\n\n`;
        });

        // Voir aussi les colonnes de la table
        const cols = await db.execute(`
            SELECT column_name, data_type, nullable
            FROM user_tab_columns
            WHERE table_name = 'FOURNISSEURS'
            ORDER BY column_id
        `);

        output += '\n=== Colonnes de FOURNISSEURS ===\n\n';
        cols.rows.forEach(row => {
            output += `${row.COLUMN_NAME}: ${row.DATA_TYPE} (${row.NULLABLE === 'Y' ? 'NULL' : 'NOT NULL'})\n`;
        });

        // Sauvegarder dans un fichier
        fs.writeFileSync('constraints-output.txt', output);
        console.log('Output saved to constraints-output.txt');

        await db.close();
    } catch (err) {
        console.error('Erreur:', err);
        process.exit(1);
    }
}

checkConstraints();
