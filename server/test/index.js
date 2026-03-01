const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();
const db = require('../config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
const authRoutes = require('../routes/authRoutes');
const productRoutes = require('../routes/productRoutes');
const orderRoutes = require('../routes/orderRoutes');
const agentRoutes = require('../routes/agentRoutes');
const documentRoutes = require('../routes/documentRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/documents', documentRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'AgriMart API is running' });
});

// Start Server
async function startServer() {
    try {
        await db.initialize();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Closing server...');
    await db.close();
    process.exit(0);
});
