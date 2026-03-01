const oracledb = require('oracledb');
const config = require('./config');

let pool = null;

async function initialize() {
    try {
        // Initialiser le client Oracle (Thick mode) pour le Wallet
        try {
            // oracledb.initOracleClient({ configDir: config.walletPath });
        } catch (err) {
            if (!err.message.includes('NJS-009')) {
                console.warn('⚠️ Oracle Client init warning:', err.message);
            }
        }

        pool = await oracledb.createPool({
            user: config.user,
            password: config.password,
            connectString: config.connectionString,
            poolMin: 2,
            poolMax: 10,
            poolIncrement: 2,
            enableStatistics: true,
            walletLocation: config.walletPath,
            walletPassword: config.walletPassword // Nécessaire pour Thin Mode si clé chiffrée
        });
        console.log('✅ Pool de connexion Oracle créé avec succès');
        return true;
    } catch (err) {
        console.error('❌ Erreur CRITIQUE connexion Oracle:', err);
        throw err;
    }
}

async function getConnection() {
    if (!pool) {
        try {
            await initialize();
        } catch (err) {
            console.error('Erreur init lazy:', err);
            throw new Error('Impossible d\'initialiser la connexion DB');
        }
    }
    if (!pool) {
        throw new Error('Le pool de connexion n\'est pas initialisé');
    }
    return await pool.getConnection();
}

async function execute(sql, binds = [], options = {}) {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(sql, binds, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
            autoCommit: true,
            ...options
        });
        return result;
    } catch (err) {
        console.error('Erreur SQL:', err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Erreur fermeture connexion:', err);
            }
        }
    }
}

async function close() {
    if (pool) {
        try {
            await pool.close(10);
            console.log('Pool Oracle fermé');
        } catch (err) {
            console.error('Erreur fermeture pool:', err);
        }
    }
}

async function testConnection() {
    try {
        const result = await execute('SELECT SYSDATE FROM dual');
        console.log('✅ Connexion Oracle testée:', result.rows[0]);
        return true;
    } catch (err) {
        console.error('❌ Test connexion échoué:', err);
        return false;
    }
}

module.exports = {
    initialize,
    getConnection,
    execute,
    close,
    testConnection
};
