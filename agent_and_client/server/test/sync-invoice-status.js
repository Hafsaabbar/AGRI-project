const db = require('../config/db');

async function syncStatuses() {
    try {
        await db.initialize();
        const connection = await db.getPool().getConnection();
        console.log('Connected to database');

        // 1. Update existing records
        const updateSql = "UPDATE ORDER_INVOICES SET STATUS = 'UNPAID' WHERE STATUS = 'ISSUED'";
        const updateResult = await connection.execute(updateSql, [], { autoCommit: true });
        console.log(`✅ Updated ${updateResult.rowsAffected} records from 'ISSUED' to 'UNPAID'`);

        // 2. Modify table default
        const alterSql = "ALTER TABLE ORDER_INVOICES MODIFY (STATUS DEFAULT 'UNPAID')";
        await connection.execute(alterSql);
        console.log("✅ Table default changed to 'UNPAID'");

        await connection.close();
        await db.close();
        console.log('Job complete!');
    } catch (err) {
        console.error('Sync error:', err);
    }
}

syncStatuses();
