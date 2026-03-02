const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function testApprove() {
    let connection;
    try {
        console.log('Testing approval logic...');

        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD
        });

        connection = await oracledb.getConnection();

        // 1. Get an agent ID (Admin)
        const agentRes = await connection.execute(`SELECT ID, ROLE FROM AGENTS WHERE ROLE = 'ADMIN' FETCH FIRST 1 ROWS ONLY`);
        if (agentRes.rows.length === 0) throw new Error('No admin found');
        const agentId = agentRes.rows[0][0];
        console.log('Using Agent ID:', agentId);

        // 2. Find a Pending Order
        const orderRes = await connection.execute(`SELECT ID, STATUS FROM ORDERS WHERE STATUS = 'PENDING' FETCH FIRST 1 ROWS ONLY`);
        let orderId;

        if (orderRes.rows.length === 0) {
            console.log('No pending order found. Creating one...');
            // Find a client
            const clientRes = await connection.execute(`SELECT ID FROM CLIENTS FETCH FIRST 1 ROWS ONLY`);
            if (clientRes.rows.length === 0) throw new Error('No clients found');
            const clientId = clientRes.rows[0][0];

            // Create Order
            const createRes = await connection.execute(
                `INSERT INTO ORDERS (ORDER_NUMBER, CLIENT_ID, TOTAL_HT, TOTAL_TVA, TOTAL_TTC, STATUS) 
                   VALUES ('TEST-ORD-001', :clientId, 100, 20, 120, 'PENDING') RETURNING ID INTO :id`,
                { clientId, id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER } },
                { autoCommit: true }
            );
            orderId = createRes.outBinds.id[0];
            console.log('Created Test Order ID:', orderId);
        } else {
            orderId = orderRes.rows[0][0];
            console.log('Found Pending Order ID:', orderId);
        }

        // 3. Attempt Approval Update
        const sql = `
            UPDATE ORDERS 
            SET STATUS = 'CONFIRMED', APPROVED_AT = CURRENT_TIMESTAMP, APPROVED_BY = :agentId
            WHERE ID = :orderId AND STATUS = 'PENDING'
        `;

        console.log(`Executing: UPDATE ORDERS SET APPROVED_BY=${agentId} WHERE ID=${orderId}`);

        const result = await connection.execute(sql, { agentId, orderId }, { autoCommit: true });

        console.log('Rows affected:', result.rowsAffected);

        if (result.rowsAffected === 1) {
            console.log('✅ Approval Successful!');
        } else {
            console.log('❌ Approval Failed (0 rows affected)');
        }

    } catch (err) {
        console.error('❌ Error executing approval:', err);
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

testApprove();
