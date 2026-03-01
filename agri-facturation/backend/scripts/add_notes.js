const db = require('../config/database');

async function addNotesColumn() {
    try {
        await db.initialize();
        console.log('Adding NOTES column to ORDER_INVOICES...');
        try {
            await db.execute(`ALTER TABLE order_invoices ADD notes VARCHAR2(1000)`);
            console.log('SUCCESS: NOTES column added.');
        } catch (err) {
            if (err.message.includes('ORA-01430')) {
                console.log('INFO: NOTES column already exists.');
            } else {
                console.error('ERROR adding NOTES:', err.message);
            }
        }
    } catch (err) {
        console.error('Script error:', err);
    } finally {
        await db.close();
    }
}

addNotesColumn();
