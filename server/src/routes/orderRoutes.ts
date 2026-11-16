
import { Router } from 'express';

import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus
} from '../controllers/orderController.js';
import {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
} from '../controllers/paymentController.js';

import { authenticate } from '../middleware/authenticate.js';
import { authorizeRole } from '../middleware/authorizeRole.js';

const router = Router();

router.use(authenticate);

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrderById);
router.patch('/:id/cancel', cancelOrder);
router.patch('/:id/status', authorizeRole('admin'), updateOrderStatus);
router.post('/:id/pay', initiateKhaltiPayment);
router.post('/:id/verify-payment', verifyKhaltiPayment);

export default router;
