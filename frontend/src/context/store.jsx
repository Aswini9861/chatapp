import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import statusesReducer from "./statusesSlice"
import chatReducer from "./chatSlice"
 

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    statuses: statusesReducer,

  },
});
