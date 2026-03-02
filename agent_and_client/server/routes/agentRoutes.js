const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { agentMiddleware, adminMiddleware } = require('../middleware/agentMiddleware');

// ============================================
// PUBLIC ROUTES (No auth required)
// ============================================

// Get list of agences (for registration form)
router.get('/agences', agentController.getAgences);

// Agent registration
router.post('/register', agentController.register);

// Agent login
router.post('/login', agentController.login);

// ============================================
// PROTECTED ROUTES (Agent auth required)
// ============================================

// Dashboard stats
router.get('/dashboard', agentMiddleware, agentController.getDashboardStats);

// --- Client Management ---

// Get pending clients (all agents can see)
router.get('/pending-clients', agentMiddleware, agentController.getPendingClients);

// Approve a client (links to this agent)
router.put('/clients/:id/approve', agentMiddleware, agentController.approveClient);

// Reject a client
router.put('/clients/:id/reject', agentMiddleware, agentController.rejectClient);

// Get agent's approved clients
router.get('/clients', agentMiddleware, agentController.getMyClients);

// Delete a client
router.delete('/clients/:id', agentMiddleware, agentController.deleteClient);

// --- Order Management ---

// Get orders from agent's clients
router.get('/orders', agentMiddleware, agentController.getOrders);

// Get order details
router.get('/orders/:id', agentMiddleware, agentController.getOrderDetails);

// Approve an order
router.put('/orders/:id/approve', agentMiddleware, agentController.approveOrder);

// Reject an order
router.put('/orders/:id/reject', agentMiddleware, agentController.rejectOrder);

// --- Delivery Notes ---

// Create delivery note
router.post('/delivery-notes', agentMiddleware, agentController.createDeliveryNote);

// Get delivery notes
router.get('/delivery-notes', agentMiddleware, agentController.getDeliveryNotes);

// --- Invoices ---

// Create invoice
router.post('/invoices', agentMiddleware, agentController.createInvoice);

// Get invoices
// Get invoices
router.get('/invoices', agentMiddleware, agentController.getInvoices);

// PDF Generation
router.get('/orders/:id/pdf', agentMiddleware, agentController.getOrderPdf);
router.get('/delivery-notes/:id/pdf', agentMiddleware, agentController.getDeliveryNotePdf);
router.get('/invoices/:id/pdf', agentMiddleware, agentController.getInvoicePdf);

module.exports = router;
