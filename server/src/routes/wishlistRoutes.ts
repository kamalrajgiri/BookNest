
import { Router } from 'express';

import {
    getWishlist,
    addWishlistItem,
    removeWishlistItem,
    clearWishlist,
} from '../controllers/wishlistController.js';

import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/', getWishlist);
router.post('/items', addWishlistItem);
router.delete('/items/:itemId', removeWishlistItem);
router.delete('/', clearWishlist);

export default router;
