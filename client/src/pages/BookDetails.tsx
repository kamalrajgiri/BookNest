
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { addItemToCart } from '../features/cart/cartSlice';
import { addItemToWishlist } from '../features/wishlist/wishlistSlice';

import { getBookById } from '../services/bookService';
import {
  createReview,
  deleteReview,
  getBookReviews,
  updateReview,
} from '../services/reviewService';

import type { Book } from '../types/book';
import type { Review } from '../types/review';

import { useAppDispatch, useAppSelector } from '../store/hooks';

const REVIEW_PAGE_SIZE = 10;

function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);

  // Review listing state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [totalReviewPages, setTotalReviewPages] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  // New review form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Edit review state
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editingRating, setEditingRating] = useState(5);
  const [editingComment, setEditingComment] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  // Fetch book details
  useEffect(() => {
    const controller = new AbortController();

    async function fetchBook() {
      try {
        setLoading(true);
        setError(null);

        if (!id || !/^[1-9]\d*$/.test(id)) {
          throw new Error('Invalid book ID.');
        }

        const result = await getBookById(Number(id));

        if (!controller.signal.aborted) {
          setBook(result);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : 'Unable to load book.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchBook();

    return () => controller.abort();
  }, [id]);

  // Fetch reviews whenever the book or review page changes
  
useEffect(() => {
  if (!book) return;

  const bookId = book.id;
  let isActive = true;

  async function fetchReviews() {
    try {
      setReviewsLoading(true);
      setReviewError(null);

      const response = await getBookReviews(bookId, {
        page: reviewPage,
        limit: REVIEW_PAGE_SIZE,
      });

      if (isActive) {
        setReviews(response.data);
        setTotalReviews(response.pagination.totalReviews);
        setTotalReviewPages(response.pagination.totalPages);
      }
    } catch (err) {
      if (isActive) {
        setReviewError(
          err instanceof Error
            ? err.message
            : 'Unable to load reviews.'
        );
      }
    } finally {
      if (isActive) {
        setReviewsLoading(false);
      }
    }
  }

  void fetchReviews();

  return () => {
    isActive = false;
  };
}, [book, reviewPage]);


  // Refresh book rating and current review page after a review changes
  async function refreshBookAndReviews() {
    if (!book) return;

    const [updatedBook, updatedReviews] = await Promise.all([
      getBookById(book.id),
      getBookReviews(book.id, {
        page: reviewPage,
        limit: REVIEW_PAGE_SIZE,
      }),
    ]);

    setBook(updatedBook);
    setReviews(updatedReviews.data);
    setTotalReviews(updatedReviews.pagination.totalReviews);
    setTotalReviewPages(updatedReviews.pagination.totalPages);
  }

  async function handleAddToCart() {
    if (!book) return;

    if (!user) {
      navigate('/login', {
        state: {
          from: { pathname: `/books/${book.id}` },
          pendingAction: 'cart',
          bookId: book.id,
        },
      });
      return;
    }

    try {
      setAddingToCart(true);
      setCartMessage(null);

      await dispatch(
        addItemToCart({ bookId: book.id, quantity: 1 })
      ).unwrap();

      setCartMessage('Book added to your cart successfully.');
    } catch (err) {
      setCartMessage(
        err instanceof Error ? err.message : 'Unable to add book to cart.'
      );
    } finally {
      setAddingToCart(false);
    }
  }

  async function handleAddToWishlist() {
    if (!book) return;

    if (!user) {
      navigate('/login', {
        state: {
          from: { pathname: `/books/${book.id}` },
          pendingAction: 'wishlist',
          bookId: book.id,
        },
      });
      return;
    }

    try {
      setCartMessage(null);

      await dispatch(addItemToWishlist(book.id)).unwrap();

      setCartMessage('Book added to your wishlist successfully.');
    } catch (err) {
      setCartMessage(
        err instanceof Error
          ? err.message
          : 'Unable to add book to wishlist.'
      );
    }
  }

  // Create a review
  async function handleCreateReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!book) return;

    if (!user) {
      navigate('/login', {
        state: {
          from: { pathname: `/books/${book.id}` },
        },
      });
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewError(null);
      setReviewMessage(null);

      await createReview({
        bookId: book.id,
        rating,
        comment: comment.trim() || null,
      });

      setRating(5);
      setComment('');
      setReviewPage(1);

      await refreshBookAndReviews();

      setReviewMessage('Your review was submitted successfully.');
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : 'Unable to submit review.'
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  // Start editing an existing review
  function startEditing(review: Review) {
    setEditingReviewId(review.id);
    setEditingRating(review.rating);
    setEditingComment(review.comment ?? '');
    setReviewError(null);
    setReviewMessage(null);
  }

  function cancelEditing() {
    setEditingReviewId(null);
    setEditingRating(5);
    setEditingComment('');
  }

  // Save review changes
  async function handleUpdateReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingReviewId === null) return;

    try {
      setSavingEdit(true);
      setReviewError(null);
      setReviewMessage(null);

      await updateReview(editingReviewId, {
        rating: editingRating,
        comment: editingComment.trim() || null,
      });

      cancelEditing();
      await refreshBookAndReviews();

      setReviewMessage('Your review was updated successfully.');
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : 'Unable to update review.'
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // Delete review
  async function handleDeleteReview(reviewId: number) {
    const confirmed = window.confirm(
      'Are you sure you want to delete your review?'
    );

    if (!confirmed) return;

    try {
      setDeletingReviewId(reviewId);
      setReviewError(null);
      setReviewMessage(null);

      await deleteReview(reviewId);

      if (editingReviewId === reviewId) {
        cancelEditing();
      }

      await refreshBookAndReviews();

      setReviewMessage('Your review was deleted successfully.');
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : 'Unable to delete review.'
      );
    } finally {
      setDeletingReviewId(null);
    }
  }

  if (loading) return <p>Loading book...</p>;

  if (error) return <p role="alert">{error}</p>;

  if (!book) return <p>Book not found.</p>;

  // Check whether the logged-in customer has reviewed this book
  const ownReview = user
    ? reviews.find((review) => review.userId === user.id)
    : undefined;

  return (
    <main>
      <Link to="/books">← Back to books</Link>

      <h1>{book.title}</h1>
      <h2>By {book.author}</h2>

      <p>{book.description}</p>
      <p>Price: Rs. {Number(book.price).toFixed(2)}</p>
      <p>Rating: {Number(book.rating).toFixed(1)} / 5</p>

      <p>
        {book.stock > 0
          ? `${book.stock} copies available`
          : 'Out of stock'}
      </p>

      <button
        type="button"
        disabled={book.stock <= 0 || addingToCart}
        onClick={() => void handleAddToCart()}
      >
        {addingToCart ? 'Adding...' : 'Add to Cart'}
      </button>

      <button
        type="button"
        onClick={() => void handleAddToWishlist()}
      >
        Add to Wishlist
      </button>

      {cartMessage && (
        <p role="status">{cartMessage}</p>
      )}

      <p>
        <Link to="/cart">View Cart</Link>
      </p>

      <hr />

      {/* Customer reviews */}
      <section>
        <h2>Customer Reviews</h2>

        <p>
          {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
        </p>

        {reviewError && (
          <p role="alert">{reviewError}</p>
        )}

        {reviewMessage && (
          <p role="status">{reviewMessage}</p>
        )}

        {reviewsLoading ? (
          <p>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p>No reviews yet. Be the first to review this book.</p>
        ) : (
          reviews.map((review) => {
            const isOwnReview = user?.id === review.userId;
            const isEditing = editingReviewId === review.id;

            return (
              <article key={review.id}>
                <h3>{review.User.name}</h3>

                {isEditing ? (
                  <form onSubmit={handleUpdateReview}>
                    <label htmlFor={`edit-rating-${review.id}`}>
                      Rating
                    </label>

                    <select
                      id={`edit-rating-${review.id}`}
                      value={editingRating}
                      onChange={(event) =>
                        setEditingRating(Number(event.target.value))
                      }
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={value}>
                          {value} / 5
                        </option>
                      ))}
                    </select>

                    <label htmlFor={`edit-comment-${review.id}`}>
                      Comment
                    </label>

                    <textarea
                      id={`edit-comment-${review.id}`}
                      value={editingComment}
                      maxLength={2000}
                      onChange={(event) =>
                        setEditingComment(event.target.value)
                      }
                    />

                    <button type="submit" disabled={savingEdit}>
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </button>

                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={savingEdit}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <p>Rating: {review.rating} / 5</p>

                    {review.comment && <p>{review.comment}</p>}

                    <p>
                      <small>
                        {new Date(review.createdAt).toLocaleString()}
                      </small>
                    </p>
                  </>
                )}

                {isOwnReview && !isEditing && (
                  <div>
                    <button
                      type="button"
                      onClick={() => startEditing(review)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={deletingReviewId === review.id}
                      onClick={() => void handleDeleteReview(review.id)}
                    >
                      {deletingReviewId === review.id
                        ? 'Deleting...'
                        : 'Delete'}
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}

        {totalReviewPages > 1 && (
          <nav aria-label="Review pagination">
            <button
              type="button"
              disabled={reviewPage <= 1 || reviewsLoading}
              onClick={() => setReviewPage((page) => page - 1)}
            >
              Previous
            </button>

            <span>
              Page {reviewPage} of {totalReviewPages}
            </span>

            <button
              type="button"
              disabled={
                reviewPage >= totalReviewPages || reviewsLoading
              }
              onClick={() => setReviewPage((page) => page + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </section>

      <hr />

      {/* Create review */}
      <section>
        <h2>Write a Review</h2>

        {!user ? (
          <p>
            <Link
              to="/login"
              state={{ from: { pathname: `/books/${book.id}` } }}
            >
              Log in
            </Link>{' '}
            to write a review.
          </p>
        ) : ownReview ? (
          <p>
            You have already reviewed this book. You can edit your review above.
          </p>
        ) : (
          <form onSubmit={handleCreateReview}>
            <label htmlFor="review-rating">Rating</label>

            <select
              id="review-rating"
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} / 5
                </option>
              ))}
            </select>

            <label htmlFor="review-comment">Comment (optional)</label>

            <textarea
              id="review-comment"
              value={comment}
              maxLength={2000}
              placeholder="Share your thoughts about this book..."
              onChange={(event) => setComment(event.target.value)}
            />

            <p>{comment.length}/2000 characters</p>

            <button type="submit" disabled={submittingReview}>
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default BookDetails;
