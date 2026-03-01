const db = require('../config/database');

async function checkConstraint() {
    try {
        await db.initialize();
        console.log('--- CHECK CONSTRAINT FK_JOURNAL_INVOICE ---');

        const result = await db.execute(`
            SELECT table_name, constraint_name, constraint_type, r_constraint_name
            FROM user_constraints
            WHERE constraint_name = 'FK_JOURNAL_INVOICE'
        `);

        if (result.rows.length === 0) {
            console.log('Constraint FK_JOURNAL_INVOICE not found.');
        } else {
            console.log('Constraint found:', result.rows[0]);

            // Get parent table/constraint info
            const parent = await db.execute(`
                SELECT table_name, constraint_name
                FROM user_constraints
                WHERE constraint_name = :rname
            `, { rname: result.rows[0].R_CONSTRAINT_NAME });

            console.log('Referenced Parent Table:', parent.rows[0]);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await db.close();
    }
}

checkConstraint();
