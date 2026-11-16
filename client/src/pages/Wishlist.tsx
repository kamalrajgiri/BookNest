
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import {
  clearCustomerWishlist,
  fetchWishlist,
  removeItemFromWishlist,
} from '../features/wishlist/wishlistSlice';

import { useAppDispatch, useAppSelector } from '../store/hooks';

function Wishlist() {
  const dispatch = useAppDispatch();

  const { wishlist, status, mutationStatus, error } = useAppSelector(
    (state) => state.wishlist
  );

  const items = wishlist?.WishlistItems ?? [];
  const isMutating = mutationStatus === 'loading';

  useEffect(() => {
    void dispatch(fetchWishlist());
  }, [dispatch]);

  function handleRemove(itemId: number) {
    void dispatch(removeItemFromWishlist(itemId));
  }

  function handleClear() {
    if (window.confirm('Are you sure you want to clear your wishlist?')) {
      void dispatch(clearCustomerWishlist());
    }
  }

  if (status === 'loading') {
    return <main><p>Loading your wishlist...</p></main>;
  }

  if (status === 'failed' && !wishlist) {
    return (
      <main>
        <p role="alert">{error ?? 'Unable to load wishlist.'}</p>
        <button
          type="button"
          onClick={() => void dispatch(fetchWishlist())}
        >
          Try again
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>My Wishlist</h1>

      {error && <p role="alert">{error}</p>}

      {items.length === 0 ? (
        <section>
          <p>Your wishlist is empty.</p>
          <Link to="/books">Explore books</Link>
        </section>
      ) : (
        <>
          <section>
            {items.map((item) => {
  const book = item.Book;

  if (!book) {
    return (
      <article key={item.id}>
        <h2>Book no longer available</h2>
        <p>This book may have been removed from the catalogue.</p>
        <button
          type="button"
          disabled={isMutating}
          onClick={() => handleRemove(item.id)}
        >
          Remove from Wishlist
        </button>
      </article>
    );
  }

  return (
    <article key={item.id}>
      <h2>
        <Link to={`/books/${book.id}`}>
          {book.title}
        </Link>
      </h2>

      <p>Author: {book.author}</p>
      <p>Price: Rs. {Number(book.price).toFixed(2)}</p>
      <p>Rating: {Number(book.rating).toFixed(1)} / 5</p>
      <p>{book.stock > 0 ? 'In stock' : 'Out of stock'}</p>

      <button
        type="button"
        disabled={isMutating}
        onClick={() => handleRemove(item.id)}
      >
        Remove
      </button>
    </article>
  );
})}
          </section>

          <button
            type="button"
            disabled={isMutating}
            onClick={handleClear}
          >
            Clear Wishlist
          </button>
        </>
      )}
    </main>
  );
}

export default Wishlist;
