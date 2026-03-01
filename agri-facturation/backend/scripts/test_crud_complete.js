const db = require('../config/database');

async function testCRUD() {
    let testId = null;
    try {
        console.log('--- TEST COMPLET CRUD ---');
        await db.initialize();

        // 0. Recuperer donnees valides
        const clientRes = await db.execute(`SELECT id FROM clients FETCH NEXT 1 ROWS ONLY`);
        const orderRes = await db.execute(`SELECT id FROM orders FETCH NEXT 1 ROWS ONLY`);
        const clientId = clientRes.rows[0]?.ID || 1;
        const orderId = orderRes.rows[0]?.ID || 1;

        // 1. CREATE
        console.log('1. TEST CREATE...');
        const createRes = await db.execute(`
            INSERT INTO order_invoices (invoice_number, client_id, order_id, total_ht, total_tva, total_ttc, status, created_at)
            VALUES ('TEST-CRUD-' || TO_CHAR(SYSDATE, 'HH24MISS'), :clientId, :orderId, 100, 20, 120, 'PENDING', SYSDATE)
            RETURNING id INTO :id
        `, {
            clientId, orderId,
            id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER }
        });
        testId = createRes.outBinds.id[0];
        console.log('Invoice created with ID:', testId);

        // 2. UPDATE (y compris NOTES et STATUS)
        console.log('2. TEST UPDATE (with NOTES)...');
        const updateBinds = {
            id: testId,
            total_ht: 200,
            notes: 'Test Notes Update',
            status: 'PAID',
            payment_method: 'Virement'
        };
        // Simulation de la logique frontend > backend
        const updateSql = `
            UPDATE order_invoices 
            SET total_ht = :total_ht, 
                notes = :notes,
                status = :status,
                paid_date = SYSDATE,
                payment_method = :payment_method
            WHERE id = :id
        `;
        await db.execute(updateSql, updateBinds);
        console.log('Update executed.');

        // Verify Update
        const verifyUpd = await db.execute(`SELECT status, notes, total_ht, payment_method FROM order_invoices WHERE id = :id`, { id: testId });
        console.log('Verified Updated Data:', verifyUpd.rows[0]);

        // 3. DELETE (Cancel)
        console.log('3. TEST DELETE (Cancel)...');
        await db.execute(`UPDATE order_invoices SET status = 'CANCELLED' WHERE id = :id`, { id: testId });
        console.log('Delete logic executed.');

        // Verify Delete
        const verifyDel = await db.execute(`SELECT status FROM order_invoices WHERE id = :id`, { id: testId });
        console.log('Verified Status after Delete:', verifyDel.rows[0].STATUS);

    } catch (err) {
        console.error('CRITICAL TEST ERROR:', err);
    } finally {
        // Cleanup
        if (testId) {
            console.log('Cleanup...');
            await db.execute(`DELETE FROM order_invoices WHERE id = :id`, { id: testId });
        }
        await db.close();
    }
}

testCRUD();
