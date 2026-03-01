const db = require('./config/database');

async function test() {
    try {
        console.log('Testing Oracle connection...');
        await db.initialize();
        console.log('SUCCESS: Connected to Oracle!');
        const result = await db.execute('SELECT SYSDATE FROM dual');
        console.log('Query result:', result.rows);
        process.exit(0);
    } catch (e) {
        console.log('FAILED:', e.message);
        console.log('Full error:', e);
        process.exit(1);
    }
}

test();
