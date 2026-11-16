import { Router } from 'express';

import {
  getBookReviews,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/reviewController.js';

import { authenticate } from '../middleware/authenticate.js';

const router = Router();

router.get('/books/:bookId', getBookReviews);

router.use(authenticate);

router.post('/', createReview);
router.patch('/:id', updateReview);
router.delete('/:id', deleteReview);

export default router;