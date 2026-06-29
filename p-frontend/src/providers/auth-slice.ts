import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  checkedAuth: false,
  userInfo: null,
  userBalance: 0,

  avatar: null,
  avatarBorder: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthenticated(state, action) {
      state.isAuthenticated = action.payload;
      state.checkedAuth = true;
    },

    setUserInfo(state, action) {
      state.userInfo = action.payload;

      if (action.payload?.avatar) {
        state.avatar = action.payload.avatar;
      }
      if (action.payload?.avatarBorder) {
        state.avatarBorder = action.payload.avatarBorder;
      }
    },

    setUserBalance(state, action) {
      state.userBalance = action.payload;
    },

    setAvatar(state, action) {
      state.avatar = action.payload;
    },
    setAvatarBorder(state, action) {
      state.avatarBorder = action.payload;
    },

    logout(state) {
      state.isAuthenticated = false;
      state.userBalance = 0;
      state.avatar = null;
      state.avatarBorder = null;

      localStorage.removeItem("accessToken");
      window.location.reload();
    },
  },
});

export const { setAuthenticated, logout, setUserInfo, setUserBalance, setAvatar, setAvatarBorder } = authSlice.actions;

export default authSlice.reducer;
