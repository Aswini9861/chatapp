// authReducer.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
 token: localStorage.getItem("accessToken") || null,
  user: null,
};


const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    login(state, action) {

      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout(state) {
      state.user = null;
      state.token = '';
    },
  },
});

// Export actions
export const { login,setUser, logout } = authSlice.actions;

// Export reducer
export default authSlice.reducer;
