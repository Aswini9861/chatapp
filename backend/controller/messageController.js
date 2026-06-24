import Message from "../model/messageModel.js";
import redisClient from "../config/redisClient.js";
import ChatModel from "../model/ChatModel.js";


export const getMessages = async (request, response) => {
  const { userId, targetId } = request.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: targetId },
        { senderId: targetId, receiverId: userId },
      ],
    }).sort({ timestamp: 1 });

    response.json({ success: true, messages });
  } catch (error) {
    response.status(500).json({ success: false, message: "Server error" });
  }
};


export const handleRegister = async (senderId, ws, users) => {
  users.set(senderId, ws);

  await redisClient.setEx(`online:${senderId}`, 60, "true");
  const statusMessage = JSON.stringify({
    type: "status",
    userId: senderId,
    status: "online",
  });
  for (const [_, userWs] of users) {
    if (userWs.readyState === 1) { // 1 = OPEN
      userWs.send(statusMessage);
    }
  }
  await handlePendingMessages(senderId, ws);
};


const saveMessage = async (messageData) => {
try {
  const newMessage = new Message({

    senderId: messageData.senderId,
    receiverId: messageData.receiverId,
    content: messageData.content,
    timestamp: messageData.timestamp,
    messageId: messageData.messageId,
    status: "sent",
  });
  await newMessage.save();
  return JSON.stringify(messageData);
} catch (error) {
  console.error("Error saving message:", error);
  return null;
}
};


const deliverMessage = async (targetWs, senderId, receiverId, messageData, users) => {
try {
  console.log("Message from", senderId, "to", receiverId);
  targetWs.send(JSON.stringify(messageData));
  messageData.status = "delivered";
  const updatedMessageString = JSON.stringify(messageData);
  const ackData = JSON.stringify({ type: "ack", messageId: messageData.messageId, status: "delivered" });
  const senderWs = users.get(senderId);
  if (senderWs) senderWs.send(ackData);

  await Message.updateOne({ messageId: messageData.messageId }, { status: "delivered" });
  const messages = await redisClient.lRange(`chat:${senderId}:${receiverId}`, 0, -1);


  const updatedMessages = messages.map((msg) =>
    JSON.parse(msg).messageId === messageData.messageId ? updatedMessageString : msg
  );
  if (updatedMessages.length > 0) {

  await redisClient.del(`chat:${senderId}:${receiverId}`);

  for (const msg of updatedMessages.reverse()) {
    await redisClient.lPush(`chat:${senderId}:${receiverId}`, msg);
  }
  }

} catch (error) {
console.error("Error delivering message:", error);
}
};


const handlePendingMessages = async (senderId, ws) => {
  const pendingMessages = await redisClient.lRange(`pending:${senderId}`, 0, -1);
  if (pendingMessages.length > 0) {
    console.log(`Sending ${pendingMessages.length} pending messages to ${senderId}`);
    pendingMessages.forEach((msg) => ws.send(msg));
    await redisClient.del(`pending:${senderId}`);
  }
};


const updateChat = async (senderId, receiverId) => {
  await ChatModel.findOneAndUpdate(
    { $or: [{ user1: senderId, user2: receiverId }, { user1: receiverId, user2: senderId }] },
    { user1: senderId, user2: receiverId },
    { upsert: true, new: true }
  );
};

export const handleMessage = async (data, ws, users) => {
  const { senderId, receiverId, content, timestamp, messageId } = data;
  const targetWs = users.get(receiverId);
  const messageData = {
    type:"message",
    senderId,
    receiverId,
    content,
    timestamp: new Date(timestamp),
    messageId: messageId || Date.now().toString(),
    status: "sent",
  };

  const messageString = await saveMessage(messageData);
  if (!messageString) {
    console.error("Failed to save message to MongoDB");
    return;
  }

  if (!targetWs) {
    await redisClient.lPush(`pending:${receiverId}`, messageString);

  } else {
    await deliverMessage(targetWs, senderId, receiverId, messageData, users);
  }
  await redisClient.lPush(`chat:${senderId}:${receiverId}`, messageString);
await redisClient.lTrim(`chat:${senderId}:${receiverId}`, 0, 49);

await redisClient.lPush(`chat:${receiverId}:${senderId}`, messageString);
await redisClient.lTrim(`chat:${receiverId}:${senderId}`, 0, 49);

  //await handlePendingMessages(senderId, ws);
  await updateChat(senderId, receiverId);
};

