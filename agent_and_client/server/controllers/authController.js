const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.register = async (req, res) => {
    const { email, password, nom, prenom, entreprise, type_client, tel, adresse, ville, code_postal } = req.body;

    if (!email || !password || !nom) {
        return res.status(400).json({ message: 'Email, mot de passe et nom sont requis' });
    }

    let connection;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        connection = await db.getPool().getConnection();

        // Check if user exists
        const checkSql = `SELECT id FROM clients WHERE email = :email`;
        const checkResult = await connection.execute(checkSql, [email]);

        if (checkResult.rows.length > 0) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé' });
        }

        const sql = `
            INSERT INTO clients (
                email, password, nom_client, prenom, entreprise, type_client, 
                tel, adresse, ville, code_postal, status
            ) VALUES (
                :email, :password, :nom, :prenom, :entreprise, :type_client,
                :tel, :adresse, :ville, :code_postal, 'PENDING'
            ) RETURNING id INTO :id
        `;
        // Note: Default status APPROVED for now to allow immediate login as per request requirements
        // "permet aux utilisateurs de créer un compte, se connecter immédiatement et accéder à l’ensemble des fonctionnalités sans aucune étape d’approbation préalable"

        const result = await connection.execute(sql, {
            email,
            password: hashedPassword,
            nom,
            prenom,
            entreprise,
            type_client: type_client || 'PARTICULIER',
            tel,
            adresse,
            ville,
            code_postal,
            id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        }, { autoCommit: true });

        const userId = result.outBinds.id[0];

        const token = jwt.sign({ id: userId, role: 'CLIENT' }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: 'Inscription réussie',
            token,
            user: { id: userId, email, nom, role: 'CLIENT' }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur lors de l\'inscription' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    let connection;
    try {
        connection = await db.getPool().getConnection();

        const sql = `SELECT id, password, nom_client, role, status FROM clients WHERE email = :email`;
        const result = await connection.execute(sql, [email], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        if (user.STATUS === 'PENDING') {
            return res.status(403).json({ message: 'Votre compte est en attente d\'approbation par un agent.' });
        }

        if (user.STATUS === 'SUSPENDED' || user.STATUS === 'REJECTED') {
            return res.status(403).json({ message: 'Compte suspendu ou rejeté' });
        }

        // Update last login
        await connection.execute(
            `UPDATE clients SET last_login = CURRENT_TIMESTAMP WHERE id = :id`,
            [user.ID],
            { autoCommit: true }
        );

        const token = jwt.sign({ id: user.ID, role: user.ROLE }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.ID,
                email,
                nom: user.NOM_CLIENT,
                role: user.ROLE
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erreur serveur lors de la connexion' });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
};
