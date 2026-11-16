
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  addCartItem,
  clearCart as clearCartRequest,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../../services/cartService';

import type { Cart } from '../../types/cart';

interface CartState {
  cart: Cart | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  mutationStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: CartState = {
  cart: null,
  status: 'idle',
  mutationStatus: 'idle',
  error: null,
};

// function getErrorMessage(error: unknown): string {
//   return error instanceof Error ? error.message : 'Something went wrong.';
// }

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async () => getCart()
);

export const addItemToCart = createAsyncThunk(
  'cart/addItem',
  async (
    { bookId, quantity = 1 }: { bookId: number; quantity?: number }
  ) => {
    await addCartItem(bookId, quantity);
    return getCart();
  }
);

export const changeCartItemQuantity = createAsyncThunk(
  'cart/changeQuantity',
  async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
    await updateCartItem(itemId, quantity);
    return getCart();
  }
);

export const removeItemFromCart = createAsyncThunk(
  'cart/removeItem',
  async (itemId: number) => {
    await removeCartItem(itemId);
    return getCart();
  }
);

export const clearCustomerCart = createAsyncThunk(
  'cart/clearCart',
  async () => {
    await clearCartRequest();
    return getCart();
  }
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    resetCart(state) {
      state.cart = null;
      state.status = 'idle';
      state.mutationStatus = 'idle';
      state.error = null;
    },
    clearCartError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.cart = action.payload;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unable to fetch cart.';
      })

      .addCase(addItemToCart.pending, (state) => {
        state.mutationStatus = 'loading';
        state.error = null;
      })
      .addCase(addItemToCart.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.cart = action.payload;
      })
      .addCase(addItemToCart.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.error = action.error.message ?? 'Unable to add item.';
      })

      .addCase(changeCartItemQuantity.pending, (state) => {
        state.mutationStatus = 'loading';
        state.error = null;
      })
      .addCase(changeCartItemQuantity.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.cart = action.payload;
      })
      .addCase(changeCartItemQuantity.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.error = action.error.message ?? 'Unable to update quantity.';
      })

      .addCase(removeItemFromCart.pending, (state) => {
        state.mutationStatus = 'loading';
        state.error = null;
      })
      .addCase(removeItemFromCart.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.cart = action.payload;
      })
      .addCase(removeItemFromCart.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.error = action.error.message ?? 'Unable to remove item.';
      })

      .addCase(clearCustomerCart.pending, (state) => {
        state.mutationStatus = 'loading';
        state.error = null;
      })
      .addCase(clearCustomerCart.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.cart = action.payload;
      })
      .addCase(clearCustomerCart.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.error = action.error.message ?? 'Unable to clear cart.';
      });
  },
});

export const { resetCart, clearCartError } = cartSlice.actions;
export default cartSlice.reducer;
