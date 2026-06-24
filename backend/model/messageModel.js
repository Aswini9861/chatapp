import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  timestamp_seen:{type: Date, default: Date.now},
  messageId: { type: String, required: true, unique: true },
  status: { type: String, enum: ["sent", "delivered"], default: "sent" },
  reactions: [
    {
      emoji: { type: String, required: true },
      userId: { type: String, required: true }, // User who added the reaction
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const Message = mongoose.model("Message", messageSchema);
export default Message;
