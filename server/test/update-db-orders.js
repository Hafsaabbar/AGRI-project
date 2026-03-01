const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function updateOrdersTable() {
    let connection;
    try {
        console.log('Updating ORDERS table schema...');

        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD
        });

        connection = await oracledb.getConnection();

        // Helper to run ALTER statements safely (ignoring "column already exists" errors)
        const runAlter = async (sql) => {
            try {
                await connection.execute(sql);
                console.log(`Executed: ${sql}`);
            } catch (err) {
                // ORA-01430: column being added already exists in table
                if (err.errorNum === 1430) {
                    console.log(`Skipped (column exists): ${sql}`);
                } else {
                    console.error(`Error executing ${sql}:`, err.message);
                }
            }
        };

        await runAlter(`ALTER TABLE ORDERS ADD APPROVED_BY NUMBER`);
        await runAlter(`ALTER TABLE ORDERS ADD APPROVED_AT TIMESTAMP`);
        await runAlter(`ALTER TABLE ORDERS ADD DELIVERED_AT TIMESTAMP`);

        // Add foreign key for APPROVED_BY if possible, keeping it nullable
        // We use a separate block because if column exists constraint might not
        try {
            await connection.execute(`ALTER TABLE ORDERS ADD CONSTRAINT FK_ORDERS_AGENT FOREIGN KEY (APPROVED_BY) REFERENCES AGENTS(ID)`);
            console.log('Added FK constraint FK_ORDERS_AGENT');
        } catch (err) {
            // ORA-02275: such a referential constraint already exists in the table
            if (err.errorNum === 2275) console.log('Skipped (FK exists): FK_ORDERS_AGENT');
            else console.error('Error adding FK:', err.message);
        }

        console.log('✅ ORDERS table updated successfully.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

updateOrdersTable();
