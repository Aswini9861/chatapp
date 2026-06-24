export const sendPendingMessages = async (users,receiverId,redisClient) => {
    const targetWs = users.get(receiverId);
    if (!targetWs) return; // Don't proceed if the user is offline

    const pendingMessages = await redisClient.lRange(`pending:${receiverId}`, 0, -1);

    if (pendingMessages.length > 0) {
      console.log(`Retrying delivery of ${pendingMessages.length} messages to ${receiverId}`);

      for (const msg of pendingMessages) {
        try {
          targetWs.send(msg);
          console.log(`Message delivered to ${receiverId}`);

          const parsedMsg = JSON.parse(msg);
          await Message.updateOne({ messageId: parsedMsg.messageId }, { status: "delivered" });

          // Send acknowledgment to the sender
          const senderWs = users.get(parsedMsg.senderId);
          if (senderWs) {
            const ackData = JSON.stringify({
              type: "ack",
              messageId: parsedMsg.messageId,
              status: "delivered",
            });
            senderWs.send(ackData);
          }
        } catch (error) {
          console.log(`Error sending pending message to ${receiverId}, will retry.`);
        }
      }

      // **Remove successfully sent messages from Redis**
      await redisClient.del(`pending:${receiverId}`);
    }
  };
