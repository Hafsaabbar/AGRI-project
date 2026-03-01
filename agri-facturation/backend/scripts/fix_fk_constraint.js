const db = require('../config/database');

async function fixForeignKey() {
    try {
        console.log('--- FIX FOREIGN KEY CONSTRAINT ---');
        await db.initialize();

        // 1. Drop existing constraint
        try {
            console.log('Dropping constraint FK_JOURNAL_INVOICE...');
            await db.execute(`ALTER TABLE journal_ventes DROP CONSTRAINT FK_JOURNAL_INVOICE`);
            console.log('Constraint dropped.');
        } catch (err) {
            if (err.message.includes('ORA-02443')) {
                console.log('Constraint does not exist (OK).');
            } else {
                console.error('Error dropping constraint:', err.message);
            }
        }

        // 2. Add correct constraint
        try {
            console.log('Adding constraint FK_JOURNAL_ORDER_INVOICE referencing ORDER_INVOICES...');
            await db.execute(`ALTER TABLE journal_ventes ADD CONSTRAINT FK_JOURNAL_ORDER_INVOICE FOREIGN KEY (invoice_id) REFERENCES order_invoices(id) ON DELETE CASCADE`);
            console.log('Constraint added successfully.');
        } catch (err) {
            if (err.message.includes('ORA-02275')) {
                console.log('Constraint already exists.');
            } else {
                console.error('Error adding constraint:', err.message);
            }
        }

    } catch (err) {
        console.error('Script error:', err);
    } finally {
        await db.close();
    }
}

fixForeignKey();
