const db = require('../config/database');

async function testUpdate() {
    try {
        console.log('--- TEST FACTURE UPDATE ---');
        await db.initialize();

        // 1. Recuperer un Client et une Commande valides
        console.log('Recherche donnees valides...');
        const clientRes = await db.execute(`SELECT id FROM clients FETCH NEXT 1 ROWS ONLY`);
        const orderRes = await db.execute(`SELECT id FROM orders FETCH NEXT 1 ROWS ONLY`);

        if (clientRes.rows.length === 0 || orderRes.rows.length === 0) {
            console.log('ERREUR: Pas de client ou commande pour le test.');
            return;
        }

        const clientId = clientRes.rows[0].ID;
        const orderId = orderRes.rows[0].ID;

        // 2. Creer une facture de test
        console.log(`Creation facture test (Client=${clientId}, Order=${orderId})...`);
        const createResult = await db.execute(`
            INSERT INTO order_invoices (invoice_number, client_id, order_id, total_ht, total_tva, total_ttc, status, created_at)
            VALUES ('TEST-' || TO_CHAR(SYSDATE, 'HH24MISS'), :clientId, :orderId, 100, 20, 120, 'PENDING', SYSDATE)
            RETURNING id, invoice_number INTO :id, :num
        `, {
            clientId,
            orderId,
            id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
            num: { dir: require('oracledb').BIND_OUT, type: require('oracledb').STRING }
        });

        const testId = createResult.outBinds.id[0];
        console.log(`Facture test creee: ID=${testId}, Num=${createResult.outBinds.num[0]}`);

        // 3. Tenter update vers PAID
        console.log('Tentative update PAID...');
        const binds = {
            status: 'PAID',
            payment_method: 'Virement',
            id: testId
        };

        const sql = `
            UPDATE order_invoices 
            SET status = :status, 
                paid_date = SYSDATE, 
                payment_method = :payment_method 
            WHERE id = :id
        `;

        await db.execute(sql, binds);
        console.log('Update SQL reussi.');

        // 4. Verifier resultat
        const verify = await db.execute(`SELECT status, paid_date, payment_method FROM order_invoices WHERE id = :id`, { id: testId });
        console.log('Resultat apres update:', verify.rows[0]);

        // 5. Cleanup
        console.log('Nettoyage...');
        await db.execute(`DELETE FROM order_invoices WHERE id = :id`, { id: testId });
        console.log('Nettoyage termine.');

    } catch (err) {
        console.error('ERREUR TEST:', err);
    } finally {
        await db.close();
    }
}

testUpdate();
