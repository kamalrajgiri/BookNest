import { Router } from 'express';
import { getBooks, getBookById, createBook, updateBook, deleteBook } from '../controllers/bookController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRole } from '../middleware/authorizeRole.js';

const router = Router();

router.get('/', getBooks);
router.get('/:id', getBookById);
router.post('/', authenticate, authorizeRole('admin'), createBook);
router.patch('/:id',authenticate, authorizeRole('admin'),updateBook);
router.delete('/:id', authenticate, authorizeRole('admin'), deleteBook);
export default router;