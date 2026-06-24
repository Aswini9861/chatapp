// src/store/statusesSlice.js
import { createSlice } from "@reduxjs/toolkit";

const statusesSlice = createSlice({
  name: "statuses",
  initialState: {
    userStatuses: {},
    typingStatuses: {},
    incomingCall: null,
  },
  reducers: {
    setUserStatuses: (state, action) => {
      state.userStatuses = action.payload;
    },
    updateUserStatus: (state, action) => {
      const { userId, status } = action.payload;
      state.userStatuses[userId] = status;
    },
    // Add typing status to the state
    setTypingStatus: (state, action) => {
      state.typingStatuses[action.payload.userId] = action.payload.isTyping;
    },
    setIncomingCall: (state, action) => {
      state.incomingCall = action.payload;
    },
  },
});

export const { setUserStatuses, updateUserStatus, setTypingStatus,setIncomingCall } =
  statusesSlice.actions;
export default statusesSlice.reducer;
