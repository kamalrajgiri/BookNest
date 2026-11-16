
import { useCallback, useEffect, useState, type FormEvent } from 'react';

import {
    createBook,
    deleteBook,
    getBooks,
    updateBook,
    type BookInput,
} from '../services/bookService';

import { getOrders, updateOrderStatus } from '../services/orderService';

import type { Book } from '../types/book';
import type { Order, OrderStatus } from '../types/order';

const emptyForm: BookInput = {
    title: '',
    author: '',
    description: '',
    price: 0,
    stock: 0,
};

function AdminDashboard() {
    const [books, setBooks] = useState<Book[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [form, setForm] = useState<BookInput>(emptyForm);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const [booksResponse, ordersResponse] = await Promise.all([
                getBooks({ limit: 100 }),
                getOrders(),
            ]);

            setBooks(booksResponse.data);
            setOrders(ordersResponse.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isActive = true;

        async function fetchDashboard() {
            try {
                setLoading(true);
                setError('');

                const [booksResponse, ordersResponse] = await Promise.all([
                    getBooks({ limit: 100 }),
                    getOrders(),
                ]);

                if (!isActive) return;

                setBooks(booksResponse.data);
                setOrders(ordersResponse.data);
            } catch (err) {
                if (!isActive) return;

                setError(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load admin dashboard.'
                );
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        }

        void fetchDashboard();

        return () => {
            isActive = false;
        };
    }, []);

    function handleFormChange(
        field: keyof BookInput,
        value: string
    ) {
        setForm((current) => ({
            ...current,
            [field]:
                field === 'price' || field === 'stock'
                    ? Number(value)
                    : value,
        }));
    }

    function startEditing(book: Book) {
        setEditingId(book.id);
        setForm({
            title: book.title,
            author: book.author,
            description: book.description,
            price: Number(book.price),
            stock: book.stock,
        });
        setMessage('');
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetForm() {
        setEditingId(null);
        setForm(emptyForm);
    }

    async function handleBookSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            setSaving(true);
            setError('');
            setMessage('');

            if (editingId !== null) {
                await updateBook(editingId, form);
                setMessage('Book updated successfully.');
            } else {
                await createBook(form);
                setMessage('Book created successfully.');
            }

            resetForm();
            await loadDashboard();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save book.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteBook(book: Book) {
        if (!window.confirm(`Soft-delete "${book.title}"?`)) return;

        try {
            setError('');
            setMessage('');
            await deleteBook(book.id);

            if (editingId === book.id) resetForm();

            setMessage('Book deleted from the catalogue.');
            await loadDashboard();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete book.');
        }
    }

    async function handleStatusChange(
        orderId: number,
        status: 'processing' | 'shipped' | 'delivered'
    ) {
        try {
            setError('');
            await updateOrderStatus(orderId, status);
            setMessage(`Order #${orderId} updated to ${status}.`);
            await loadDashboard();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to update order.');
        }
    }

    function nextStatus(status: OrderStatus) {
        if (status === 'paid') return 'processing';
        if (status === 'processing') return 'shipped';
        if (status === 'shipped') return 'delivered';
        return null;
    }

    if (loading) return <p>Loading admin dashboard...</p>;

    return (
        <section>
            <h1>Admin Dashboard</h1>

            <p>
                Books: {books.length} | Orders: {orders.length}
            </p>

            {error && <p role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}

            <hr />

            <h2>{editingId !== null ? 'Edit Book' : 'Add New Book'}</h2>

            <form onSubmit={handleBookSubmit}>
                <div>
                    <label htmlFor="book-title">Title</label>
                    <input
                        id="book-title"
                        value={form.title}
                        onChange={(e) => handleFormChange('title', e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="book-author">Author</label>
                    <input
                        id="book-author"
                        value={form.author}
                        onChange={(e) => handleFormChange('author', e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="book-description">Description</label>
                    <textarea
                        id="book-description"
                        value={form.description}
                        onChange={(e) => handleFormChange('description', e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="book-price">Price</label>
                    <input
                        id="book-price"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => handleFormChange('price', e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="book-stock">Stock</label>
                    <input
                        id="book-stock"
                        type="number"
                        min="0"
                        step="1"
                        value={form.stock}
                        onChange={(e) => handleFormChange('stock', e.target.value)}
                        required
                    />
                </div>

                <button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingId !== null ? 'Update Book' : 'Create Book'}
                </button>

                {editingId !== null && (
                    <button type="button" onClick={resetForm}>
                        Cancel Edit
                    </button>
                )}
            </form>

            <hr />

            <h2>Manage Books</h2>

            {books.length === 0 ? (
                <p>No books found.</p>
            ) : (
                <div>
                    {books.map((book) => (
                        <article key={book.id}>
                            <h3>{book.title}</h3>
                            <p>Author: {book.author}</p>
                            <p>Price: Rs. {book.price}</p>
                            <p>Stock: {book.stock}</p>

                            <button type="button" onClick={() => startEditing(book)}>
                                Edit
                            </button>

                            <button type="button" onClick={() => void handleDeleteBook(book)}>
                                Delete
                            </button>
                        </article>
                    ))}
                </div>
            )}

            <hr />

            <h2>Manage Orders</h2>

            {orders.length === 0 ? (
                <p>No orders found.</p>
            ) : (
                <div>
                    {orders.map((order) => {
                        const next = nextStatus(order.status);

                        return (
                            <article key={order.id}>
                                <h3>Order #{order.id}</h3>
                                <p>Customer: {order.User?.name ?? `User #${order.userId}`}</p>
                                <p>Email: {order.User?.email ?? 'Not provided'}</p>
                                <p>Date: {new Date(order.createdAt).toLocaleString()}</p>
                                <p>Order status: {order.status}</p>
                                <p>Payment: {order.Payment?.status ?? 'Unknown'}</p>
                                <p>Total: Rs. {order.totalAmount}</p>

                                <ul>
                                    {order.OrderItems.map((item) => (
                                        <li key={item.id}>
                                            {item.bookTitle} × {item.quantity} — Rs. {item.unitPrice}
                                        </li>
                                    ))}
                                </ul>

                                {next && (
                                    <button
                                        type="button"
                                        onClick={() => void handleStatusChange(order.id, next)}
                                    >
                                        Mark as {next}
                                    </button>
                                )}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default AdminDashboard;
