const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config();

const walletPath = path.resolve(__dirname, 'wallet');

async function updateStatusConstraint() {
    let connection;
    try {
        console.log('Updating STATUS constraint...');

        await oracledb.createPool({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: 'agrimartdb_high',
            configDir: walletPath,
            walletLocation: walletPath,
            walletPassword: process.env.WALLET_PASSWORD,
            fetchAsString: [oracledb.CLOB]
        });

        connection = await oracledb.getConnection();

        // 1. Find the constraint
        const result = await connection.execute(
            `SELECT CONSTRAINT_NAME, SEARCH_CONDITION FROM USER_CONSTRAINTS WHERE TABLE_NAME = 'ORDERS' AND CONSTRAINT_TYPE = 'C'`
        );

        let constraintName = null;
        for (const row of result.rows) {
            const condition = row[1];
            if (condition && condition.includes('PENDING')) {
                constraintName = row[0];
                console.log(`Found STATUS constraint: ${constraintName} (${condition})`);
                break;
            }
        }

        if (constraintName) {
            // 2. Drop it
            console.log(`Dropping constraint ${constraintName}...`);
            await connection.execute(`ALTER TABLE ORDERS DROP CONSTRAINT ${constraintName}`);
            console.log('Constraint dropped.');
        } else {
            console.log('Constraint not found (maybe already dropped or named differently). Proceeding to add new one...');
        }

        // 3. Add new constraint
        const newConstraint = `STATUS IN ('PENDING', 'CONFIRMED', 'DELIVERED', 'CANCELLED', 'PARTIAL', 'REJECTED', 'APPROVED')`; // Added APPROVED just in case
        console.log('Adding new constraint...');
        await connection.execute(`ALTER TABLE ORDERS ADD CONSTRAINT CHK_ORDERS_STATUS CHECK (${newConstraint})`);
        console.log('✅ New STATUS constraint added successfully.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        if (connection) {
            try { await connection.close(); } catch (e) { }
        }
        try { await oracledb.getPool().close(0); } catch (e) { }
    }
}

updateStatusConstraint();
