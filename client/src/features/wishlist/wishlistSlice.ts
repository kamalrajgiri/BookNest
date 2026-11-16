
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import {
  addWishlistItem,
  clearWishlist as clearWishlistRequest,
  getWishlist,
  removeWishlistItem,
} from '../../services/wishlistService';

import type { Wishlist } from '../../types/wishlist';

interface WishlistState {
  wishlist: Wishlist | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  mutationStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: WishlistState = {
  wishlist: null,
  status: 'idle',
  mutationStatus: 'idle',
  error: null,
};

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async () => getWishlist()
);

export const addItemToWishlist = createAsyncThunk(
  'wishlist/addItem',
  async (bookId: number) => {
    await addWishlistItem(bookId);
    return getWishlist();
  }
);

export const removeItemFromWishlist = createAsyncThunk(
  'wishlist/removeItem',
  async (itemId: number) => {
    await removeWishlistItem(itemId);
    return getWishlist();
  }
);

export const clearCustomerWishlist = createAsyncThunk(
  'wishlist/clearWishlist',
  async () => {
    await clearWishlistRequest();
    return getWishlist();
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    resetWishlist(state) {
      state.wishlist = null;
      state.status = 'idle';
      state.mutationStatus = 'idle';
      state.error = null;
    },
    clearWishlistError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.wishlist = action.payload;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unable to fetch wishlist.';
      })

      .addCase(addItemToWishlist.pending, (state) => {
        state.mutationStatus = 'loading';
        state.error = null;
      })
      .addCase(addItemToWishlist.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.wishlist = action.payload;
      })
      .addCase(addItemToWishlist.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.error = action.error.message ?? 'Unable to add book.';
      })

      .addCase(removeItemFromWishlist.pending, (state) => {
        state.mutationStatus = 'loading';
        state.error = null;
      })
      .addCase(removeItemFromWishlist.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.wishlist = action.payload;
      })
      .addCase(removeItemFromWishlist.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.error = action.error.message ?? 'Unable to remove book.';
      })

      .addCase(clearCustomerWishlist.pending, (state) => {
        state.mutationStatus = 'loading';
        state.error = null;
      })
      .addCase(clearCustomerWishlist.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.wishlist = action.payload;
      })
      .addCase(clearCustomerWishlist.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.error = action.error.message ?? 'Unable to clear wishlist.';
      });
  },
});

export const { resetWishlist, clearWishlistError } = wishlistSlice.actions;

export default wishlistSlice.reducer;
