import redisClient from "../config/redisClient.js";
import Message from "../model/messageModel.js";


export const getcachedMessages = async (request, response) => {
  const { userId, targetId } = request.params;
  const { lastMessageId, limit = 30 } = request.query;


  try {
    // Fetch messages from Redis
    const userToTargetMessages = await redisClient.lRange(`chat:${userId}:${targetId}`, 0, -1);
    const targetToUserMessages = await redisClient.lRange(`chat:${targetId}:${userId}`, 0, -1);

    // Parse messages and remove duplicates
    const allMessages = [
      ...userToTargetMessages.map(JSON.parse),
      ...targetToUserMessages.map(JSON.parse),
    ];
    const uniqueMessages = Array.from(
      new Map(allMessages.map((msg) => [msg.messageId, msg])).values()
    );

    // Sort by timestamp (oldest first)
    uniqueMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let paginatedMessages = [];
    if (lastMessageId) {
      const lastIndex = uniqueMessages.findIndex((msg) => msg.messageId === lastMessageId);
      if (lastIndex > -1) {
        // Fetch messages older than lastMessageId
        const startIndex = Math.max(0, lastIndex - Number(limit));
        paginatedMessages = uniqueMessages.slice(startIndex, lastIndex);
      }
    } else {
      const startIndex = Math.max(0, uniqueMessages.length - Number(limit));
      paginatedMessages = uniqueMessages.slice(startIndex);
    }

    if (paginatedMessages.length > 0) {
      return response.status(200).json({ success: true, messages: paginatedMessages });
    }

    // If Redis has no messages or pagination yields nothing, fetch from MongoDB
    const query = {
      $or: [
        { senderId: userId, receiverId: targetId },
        { senderId: targetId, receiverId: userId },
      ],
    };

    let dbQuery = Message.find({$or: [
      { senderId: userId, receiverId: targetId },
      { senderId: targetId, receiverId: userId },
    ]}).sort({ timestamp: 1 })
    .select("senderId receiverId content timestamp status messageId reactions").lean();

    if (lastMessageId) {
      const lastMessage = await Message.findOne({ messageId: lastMessageId });
      if (lastMessage) {
        dbQuery = Message.find({
          ...query,
          timestamp: { $lt: lastMessage.timestamp }, // Strictly older messages
        })
          .sort({ timestamp: -1 })
          .limit(Number(limit));
      }
    }

    const messages = await dbQuery.exec();

    // If no messages are found, return an empty array
    if (messages.length === 0) {
      return response.status(200).json({ success: true, messages: [] });
    }

    const sortedMessages = messages.reverse(); // Sort by timestamp (oldest first)  new added

    // Cache messages in Redis
    for (const msg of sortedMessages) {
      await redisClient.rPush(`chat:${msg.senderId}:${msg.receiverId}`, JSON.stringify(msg));
    }

    response.status(200).json({ success: true, messages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    response.status(500).send({ success: false, message: "Internal Server Error" });
  }
};



