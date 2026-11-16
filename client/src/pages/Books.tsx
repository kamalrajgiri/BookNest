
import { useEffect, useState } from 'react';

import BookCard from '../components/books/BookCard';
import { getBooks } from '../services/bookService';
import type { Book, BookPagination } from '../types/book';

function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [pagination, setPagination] =
    useState<BookPagination | null>(null);

  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBooks() {
      try {
        setLoading(true);
        setError(null);

        const response = await getBooks({
          search,
          minPrice: minPrice === '' ? undefined : Number(minPrice),
          maxPrice: maxPrice === '' ? undefined : Number(maxPrice),
          minRating: minRating === '' ? undefined : Number(minRating),
          page,
          limit: 10,
        });

        setBooks(response.data);
        setPagination(response.pagination);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load books.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchBooks();

    return () => controller.abort();
  }, [search, minPrice, maxPrice, minRating, page]);

  function handleFilterChange(
    setter: (value: string) => void,
    value: string
  ) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setPage(1);
  }

  return (
    <section>
      <h1>Explore Books</h1>

      <div>
        <label htmlFor="search">Search books</label>
        <input
          id="search"
          type="search"
          placeholder="Search by title or author"
          value={search}
          onChange={(event) =>
            handleFilterChange(setSearch, event.target.value)
          }
        />
      </div>

      <div>
        <label htmlFor="minPrice">Minimum price</label>
        <input
          id="minPrice"
          type="number"
          min="0"
          value={minPrice}
          onChange={(event) =>
            handleFilterChange(setMinPrice, event.target.value)
          }
        />

        <label htmlFor="maxPrice">Maximum price</label>
        <input
          id="maxPrice"
          type="number"
          min="0"
          value={maxPrice}
          onChange={(event) =>
            handleFilterChange(setMaxPrice, event.target.value)
          }
        />

        <label htmlFor="minRating">Minimum rating</label>
        <select
          id="minRating"
          value={minRating}
          onChange={(event) =>
            handleFilterChange(setMinRating, event.target.value)
          }
        >
          <option value="">All ratings</option>
          <option value="1">1+ stars</option>
          <option value="2">2+ stars</option>
          <option value="3">3+ stars</option>
          <option value="4">4+ stars</option>
          <option value="5">5 stars</option>
        </select>

        <button type="button" onClick={clearFilters}>
          Clear filters
        </button>
      </div>

      {loading && <p>Loading books...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && books.length === 0 && (
        <p>No books found. Try changing your filters.</p>
      )}

      {!loading && !error && books.length > 0 && (
        <>
          <p>{pagination?.totalBooks} books found</p>

          <div>
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          <div>
            <button
              type="button"
              disabled={!pagination?.hasPreviousPage}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>

            <span>
              Page {pagination?.currentPage} of {pagination?.totalPages}
            </span>

            <button
              type="button"
              disabled={!pagination?.hasNextPage}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default Books;
