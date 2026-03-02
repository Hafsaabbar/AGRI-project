const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/authMiddleware');
const { agentMiddleware } = require('../middleware/agentMiddleware');

// ============================================
// CLIENT DOCUMENT ROUTES
// ============================================

// Get list of all client documents
router.get('/my-documents', authMiddleware, documentController.getClientDocuments);

// Download order PDF (client access)
router.get('/order/:id/pdf', authMiddleware, documentController.getOrderPdf);

// Download delivery note PDF (client access)
router.get('/delivery-note/:id/pdf', authMiddleware, documentController.getDeliveryNotePdf);

// Download invoice PDF (client access)
router.get('/invoice/:id/pdf', authMiddleware, documentController.getInvoicePdf);

// Pay invoice (client access)
router.post('/invoice/:id/pay', authMiddleware, documentController.payInvoice);

// ============================================
// AGENT DOCUMENT ROUTES
// ============================================

// Agent can also access PDFs
router.get('/agent/order/:id/pdf', agentMiddleware, documentController.getOrderPdf);
router.get('/agent/delivery-note/:id/pdf', agentMiddleware, documentController.getDeliveryNotePdf);
router.get('/agent/invoice/:id/pdf', agentMiddleware, documentController.getInvoicePdf);

module.exports = router;
