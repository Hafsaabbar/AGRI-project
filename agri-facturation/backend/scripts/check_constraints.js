const db = require('../config/database');
const fs = require('fs');

async function checkConstraints() {
    try {
        await db.initialize();
        const result = await db.execute(`
            SELECT constraint_name, constraint_type, search_condition
            FROM user_constraints
            WHERE table_name = 'ORDER_INVOICES'
        `);

        let output = 'CONSTRAINTS OF ORDER_INVOICES:\n';
        result.rows.forEach(r => {
            output += `[${r.CONSTRAINT_NAME}] Type: ${r.CONSTRAINT_TYPE}, Condition: ${r.SEARCH_CONDITION}\n`;
        });

        fs.writeFileSync('constraints.txt', output);
        console.log('Constraints dumped to constraints.txt');

    } catch (err) {
        console.error(err);
    } finally {
        await db.close();
    }
}

checkConstraints();
