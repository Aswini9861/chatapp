// src/store/chatSlice.js
import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: [],
    selectedUser: null,
  },
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload;
    },
    addMessage: (state, action) => {
      const exists = state.messages.some(msg => msg.messageId === action.payload.messageId);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    updateMessageStatus: (state, action) => {
      const { messageId, status } = action.payload;
      const messageIds = Array.isArray(messageId) ? messageId : [messageId]; // Ensure it's always an array
      state.messages.forEach((msg) => {
        if (messageIds.includes(msg.messageId)) {
          msg.status = status;
        }
      });
    },

    setSelectedUser: (state, action) => {
      state.selectedUser = action.payload;
    },
    updateMessageReaction: (state, action) => {
      const { messageId, emoji, userId, action: reactionAction } = action.payload;
      state.messages = state.messages.map((msg) => {
        if (msg.messageId === messageId) {
          let reactions = msg.reactions || [];
          if (reactionAction === "add") {
            reactions = [...reactions, { emoji, userId, timestamp: new Date().toISOString() }];
          } else if (reactionAction === "remove") {
            reactions = reactions.filter((r) => !(r.emoji === emoji && r.userId === userId));
          }
          return { ...msg, reactions };
        }
        return msg;
      });
    },
    upsertMessages: (state, action) => {
      const { messages: newMessages, reset } = action.payload;

      if (reset) {
        state.messages = newMessages;
        return;
      }

      const existingIds = new Set(state.messages.map((msg) => msg.messageId));
      const uniqueMessages = newMessages.filter((msg) => !existingIds.has(msg.messageId));

      // Merge and sort
      state.messages = [...state.messages, ...uniqueMessages].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
    },


  },
});

export const { setMessages, addMessage, updateMessageStatus, setSelectedUser, updateMessageReaction, upsertMessages } = chatSlice.actions;
export default chatSlice.reducer;