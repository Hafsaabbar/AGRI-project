const db = require('./config/database');
db.initialize().then(async () => {
    console.log('Connected');
    try {
        const r = await db.execute("SELECT table_name FROM user_tables");
        console.log(JSON.stringify(r.rows));
    } catch (e) { console.error(e); }
    process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
