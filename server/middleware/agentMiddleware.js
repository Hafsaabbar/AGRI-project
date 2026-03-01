const jwt = require('jsonwebtoken');

// Middleware to verify agent JWT token
const agentMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token d\'authentification requis' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if it's an agent (not a client)
        if (decoded.userType !== 'AGENT') {
            return res.status(403).json({ message: 'Accès réservé aux agents' });
        }

        req.agent = {
            id: decoded.id,
            role: decoded.role,
            agenceId: decoded.agenceId
        };

        next();
    } catch (err) {
        console.error('Agent auth error:', err.message);
        return res.status(401).json({ message: 'Token invalide ou expiré' });
    }
};

// Middleware to verify admin role
const adminMiddleware = (req, res, next) => {
    if (req.agent && req.agent.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
};

module.exports = { agentMiddleware, adminMiddleware };
