import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateJwt);

// Daily summary report for cashier / receptionist
router.get('/daily-summary', requireRole('receptionist', 'hospital_admin', 'super_admin'), InvoiceController.getDailySummary);

// Invoice PDF generation
router.get('/:id/pdf', InvoiceController.downloadInvoicePdf);

// Mark payment collected
router.put('/:id/pay', requireRole('receptionist', 'hospital_admin', 'super_admin'), InvoiceController.markPayment);

// List and view invoices
router.get('/', InvoiceController.getInvoices);
router.get('/:id', InvoiceController.getInvoiceById);

export default router;
