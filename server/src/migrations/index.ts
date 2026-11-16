import {
  up as createBooks,
  down as dropBooks,
} from "./202611120001-create-books.js";

import {
  up as createUsers,
  down as dropUsers,
} from "./202611130001-create-users.js";

import {
  up as createCarts,
  down as dropCarts,
} from "./202611130002-create-carts.js";

import {
  up as createCartItems,
  down as dropCartItems,
} from "./202611130003-create-cart-items.js";

import {
  up as createWishlists,
  down as dropWishlists,
} from "./202611140001-create-wishlists.js";
import {
  up as createWishlistItems,
  down as dropWishlistItems,
} from "./202611140002-create-wishlist-items.js";

import {
  up as createOrders,
  down as dropOrders,
} from "./202611140003-create-orders.js";

import {
  up as createOrderItems,
  down as dropOrderItems,
} from "./202611140004-create-order-items.js";

import {
  up as createPayments,
  down as dropPayments,
} from "./202611140005-create-payments.js";

import {
  up as createRefreshTokens,
  down as dropRefreshTokens,
} from "./202611140006-create-refresh-tokens.js";

import {
  up as createReviews,
  down as dropReviews,
} from "./202611140007-create-reviews.js";

import {
  up as createNotifications,
  down as dropNotifications,
} from "./202611140008-create-notifications.js";

import {
  up as addPidxToPayments,
  down as removePidxFromPayments,
} from './202611150001-add-pidx-to-payments.js';

import {
  up as addPaymentSessionDetails,
  down as removePaymentSessionDetails,
} from './202611160001-add-payment-session-details.js';

export const migrations = [
  {
    name: "202611120001-create-books",
    up: createBooks,
    down: dropBooks,
  },
  {
    name: "202611130001-create-users",
    up: createUsers,
    down: dropUsers,
  },
  {
    name: "202611130002-create-carts",
    up: createCarts,
    down: dropCarts,
  },
  {
    name: "202611130003-create-cart-items",
    up: createCartItems,
    down: dropCartItems,
  },
  {
    name: "202611140001-create-wishlists",
    up: createWishlists,
    down: dropWishlists,
  },
  {
    name: "202611140002-create-wishlist-items",
    up: createWishlistItems,
    down: dropWishlistItems,
  },
  {
    name: "202611140003-create-orders",
    up: createOrders,
    down: dropOrders,
  },
  {
    name: "202611140004-create-order-items",
    up: createOrderItems,
    down: dropOrderItems,
  },
  {
    name: "202611140005-create-payments",
    up: createPayments,
    down: dropPayments,
  },
  {
    name: "202611140006-create-refresh-tokens",
    up: createRefreshTokens,
    down: dropRefreshTokens,
  },
  {
    name: "202611140007-create-reviews",
    up: createReviews,
    down: dropReviews,
  },
  {
    name: "202611140008-create-notifications",
    up: createNotifications,
    down: dropNotifications,
  },
  {
  name: '202611150001-add-pidx-to-payments',
  up: addPidxToPayments,
  down: removePidxFromPayments,
},
{
  name: '202611160001-add-payment-session-details',
  up: addPaymentSessionDetails,
  down: removePaymentSessionDetails,
},
];