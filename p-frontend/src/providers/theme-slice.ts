import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  mode: "light",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setMode(state, action) {
      state.mode = action.payload;
      localStorage.setItem("themeMode", state.mode);
    },
    toggleMode(state) {
      state.mode = state.mode === "dark" ? "light" : "dark";
      localStorage.setItem("themeMode", state.mode);
    },
  },
});

export const { setMode, toggleMode } = themeSlice.actions;
export default themeSlice.reducer;
