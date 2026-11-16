
import { Link } from 'react-router-dom';
import type { Book } from '../../types/book';

interface BookCardProps {
  book: Book;
}

function BookCard({ book }: BookCardProps) {
  return (
    <article>
      <h3>
        <Link to={`/books/${book.id}`}>
          {book.title}
        </Link>
      </h3>

      <p>By {book.author}</p>
      <p>Rs. {Number(book.price).toFixed(2)}</p>
      <p>Rating: {Number(book.rating).toFixed(1)} / 5</p>

      <p>
        {book.stock > 0
          ? `In stock: ${book.stock}`
          : 'Out of stock'}
      </p>

      <Link to={`/books/${book.id}`}>View details</Link>
    </article>
  );
}

export default BookCard;
