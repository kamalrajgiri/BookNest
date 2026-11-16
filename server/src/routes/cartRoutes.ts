
import { Router } from 'express';

import {
    getCart,
    addCartItem,
    updateCartItem,
    removeCartItem,
    clearCart,
} from '../controllers/cartController.js';

import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/', getCart);
router.post('/items', addCartItem);
router.patch('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.delete('/', clearCart);

export default router;
