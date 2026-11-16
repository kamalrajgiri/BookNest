import Book from './Book.js';
import User from './User.js';
import Cart from './Cart.js';
import CartItem from './CartItem.js';
import Wishlist from './Wishlist.js';
import WishlistItem from './WishlistItem.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import Payment from './Payment.js';
import RefreshToken from './RefreshToken.js';
import Review from './Review.js';
import Notification from './Notification.js';

User.hasOne(Cart, { foreignKey: 'userId' });
Cart.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Wishlist, { foreignKey: 'userId' });
Wishlist.belongsTo(User, { foreignKey: 'userId' });

Cart.hasMany(CartItem, { foreignKey: 'cartId' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId' });

Wishlist.hasMany(WishlistItem, { foreignKey: 'wishlistId' });
WishlistItem.belongsTo(Wishlist, { foreignKey: 'wishlistId' });

// User - Order
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

// Order - OrderItem
Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// Book - OrderItem
Book.hasMany(OrderItem, { foreignKey: 'bookId' });
OrderItem.belongsTo(Book, { foreignKey: 'bookId' });

// Order - Payment
Order.hasOne(Payment, { foreignKey: 'orderId' });
Payment.belongsTo(Order, { foreignKey: 'orderId' });

// Book - CartItem
Book.hasMany(CartItem, { foreignKey: 'bookId' });
CartItem.belongsTo(Book, { foreignKey: 'bookId' });

// Book - WishlistItem
Book.hasMany(WishlistItem, { foreignKey: 'bookId' });
WishlistItem.belongsTo(Book, { foreignKey: 'bookId' });

// User - RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'userId' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

// User - Review
User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { foreignKey: 'userId' });

// Book - Review
Book.hasMany(Review, { foreignKey: 'bookId' });
Review.belongsTo(Book, { foreignKey: 'bookId' });

// User - Notification
User.hasMany(Notification, { foreignKey: 'userId' });
Notification.belongsTo(User, { foreignKey: 'userId' });

export {
  Book,
  User,
  Cart,
  CartItem,
  Wishlist,
  WishlistItem,
  Order,
  OrderItem,
  Payment,
  RefreshToken,
  Review,
  Notification,
};