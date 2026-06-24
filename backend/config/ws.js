import { WebSocketServer, WebSocket } from "ws";
import Message from "../model/messageModel.js";
import redisClient from "./redisClient.js";
// ChatModel is imported but not used in this snippet, assuming it's used elsewhere
// import ChatModel from "../model/ChatModel.js";
import {
  handleMessage,
  handleRegister,
} from "../controller/messageController.js";

export const setupWebSocket = (server) => {
  const wss = new WebSocketServer({ server });
  // Assuming 'colors' or similar library for console output styling
  console.log(
    `WebSocket server running on ws://localhost:${server.address().port}`
      .bgYellow.green,
  );

  // Map to store active user connections
  const users = new Map();

  // Global heartbeat interval for all clients
  // This interval pings all active clients to check their responsiveness
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      // Check if the client is still alive
      if (client.readyState === WebSocket.OPEN) {
        if (!client.isAlive) {
          // If client didn't respond to previous pings
          client.missedHeartbeats = (client.missedHeartbeats || 0) + 1;
          console.log(`Client missed ${client.missedHeartbeats} heartbeats`);
          if (client.missedHeartbeats >= 3) {
            // Terminate connection if too many heartbeats are missed
            console.log("Terminating inactive connection");
            client.terminate();
          }
        } else {
          // Mark client as not alive for the next check
          client.isAlive = false;
        }
        // Send a ping to the client
        client.ping();
      }
    });
  }, 30000); // Ping every 30 seconds

  // When the WebSocket server itself closes, clear the global heartbeat interval
  wss.on("close", () => {
    console.log(
      "WebSocket server closing, clearing global heartbeat interval.",
    );
    clearInterval(heartbeatInterval);
  });

  // Handle new WebSocket connections
  wss.on("connection", (ws, req) => {
    console.log("New WebSocket connection established");
    // Initialize client's alive status and missed heartbeats count
    ws.isAlive = true;
    ws.missedHeartbeats = 0;

    // Listen for 'pong' responses from the client
    // This confirms the client is still active
    ws.on("pong", () => {
      ws.isAlive = true;
      ws.missedHeartbeats = 0;
      // console.log("Received pong from client"); // Uncomment for debugging pongs
    });

    // Listen for messages from clients
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message);
        const { type, senderId, userIds, messageId } = data;

        if (type === "register") {
          // Handle user registration
          await handleRegister(senderId, ws, users);
          // Mark user as online in Redis with a TTL
          await redisClient.setEx(`online:${senderId}`, 45, "true");
          console.log(`User ${senderId} registered and marked online`);
        } else if (type === "heartbeat") {
          // Handle custom heartbeat messages from client
          ws.isAlive = true; // Reset server-side alive status
          ws.missedHeartbeats = 0;
          await redisClient.setEx(`online:${senderId}`, 45, "true"); // Refresh TTL on heartbeat
          // console.log(`Heartbeat from ${senderId}, status refreshed`); // Uncomment for debugging heartbeats
        } else if (type === "message") {
          // Handle incoming chat messages
          await handleMessage(data, ws, users);
        } else if (type === "mark_seen") {
          // Handle messages being marked as seen
          const {
            messageId: messageIdsToMark,
            senderId: originalSenderId,
            receiverId,
          } = data;
          const messageIdsArray = Array.isArray(messageIdsToMark)
            ? messageIdsToMark
            : [messageIdsToMark];
          console.log("Marking messages as seen:", messageIdsArray);

          // Update message status in MongoDB
          await Message.updateMany(
            {
              messageId: { $in: messageIdsArray },
              senderId: originalSenderId,
              receiverId,
            },
            { $set: { status: "seen" } },
          );

          // Update message status in Redis cache
          const keys = [
            `chat:${originalSenderId}:${receiverId}`,
            `chat:${receiverId}:${originalSenderId}`,
          ];
          for (const key of keys) {
            const messages = await redisClient.lRange(key, 0, -1);
            if (!messages || messages.length === 0) continue;

            const updatedMessages = messages.map((msg) => {
              const parsedMsg = JSON.parse(msg);
              if (messageIdsArray.includes(parsedMsg.messageId)) {
                parsedMsg.status = "seen";
              }
              return JSON.stringify(parsedMsg);
            });
            // Update Redis list with modified messages
            for (let i = 0; i < updatedMessages.length; i++) {
              await redisClient.lSet(key, i, updatedMessages[i]);
            }
          }
          // Acknowledge the 'seen' status back to the original sender
          const senderWs = users.get(originalSenderId);
          if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            senderWs.send(
              JSON.stringify({
                type: "ack",
                messageId: messageIdsArray,
                status: "seen",
              }),
            );
          }
        } else if (type === "getStatuses") {
          // Provide online/offline statuses for requested user IDs
          const statuses = {};
          for (const userId of userIds) {
            const isOnline = await redisClient.get(`online:${userId}`);
            statuses[userId] = isOnline === "true" ? "online" : "offline";
          }
          ws.send(JSON.stringify({ type: "statuses", statuses }));
          console.log("Sent statuses:", statuses);
        } else if (type === "typing") {
          // Relay typing events to the receiver
          const { senderId, receiverId, isTyping } = data;
          const targetWs = users.get(receiverId);
          if (targetWs && targetWs.readyState === WebSocket.OPEN) {
            targetWs.send(
              JSON.stringify({
                type: "typing",
                senderId,
                receiverId,
                isTyping: data.isTyping,
              }),
            );
            console.log(`Typing event from ${senderId} sent to ${receiverId}`);
          }
        }

        //added call functionality start ########## start ###########
        else if (type === "call-user") {
          console.log("data:",data)
          const { callerId, receiverId, callType } = data;

          const receiverWs = users.get(receiverId);

          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(
              JSON.stringify({
                type: "incoming-call",
                callerId,
                callType,
              }),
            );
          }
        } else if (type === "call-accepted") {
          const { callerId, receiverId } = data;
          console.log("call-accepted: callerId=", callerId, "receiverId=", receiverId);

          const callerWs = users.get(callerId);

          if (callerWs && callerWs.readyState === WebSocket.OPEN) {
            callerWs.send(
              JSON.stringify({
                type: "call-accepted",
                receiverId,
              }),
            );
          }
        } else if (type === "call-rejected") {
          const { callerId } = data;

          const callerWs = users.get(callerId);

          if (callerWs && callerWs.readyState === WebSocket.OPEN) {
            callerWs.send(
              JSON.stringify({
                type: "call-rejected",
              }),
            );
          }
        } else if (type === "offer") {
          const { receiverId, offer, senderId } = data;

          const receiverWs = users.get(receiverId);

          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(
              JSON.stringify({
                type: "offer",
                senderId,
                offer,
              }),
            );
          }
        } else if (type === "answer") {
          const { receiverId, answer, senderId } = data;

          const receiverWs = users.get(receiverId);

          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(
              JSON.stringify({
                type: "answer",
                senderId,
                answer,
              }),
            );
          }
        } else if (type === "ice-candidate") {
          const { receiverId, candidate, senderId } = data;

          const receiverWs = users.get(receiverId);

          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(
              JSON.stringify({
                type: "ice-candidate",
                senderId,
                candidate,
              }),
            );
          }
        } else if (type === "end-call") {
          const { receiverId } = data;

          const receiverWs = users.get(receiverId);

          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(
              JSON.stringify({
                type: "end-call",
              }),
            );
          }
        }

        //added call functionality ########## end ###########
        else if (type === "reaction") {
          // Handle message reactions (add/remove)
          const { senderId, receiverId, messageId, emoji, action } = data;

          // Update the message in MongoDB
          if (action === "add") {
            await Message.updateOne(
              { messageId },
              {
                $push: {
                  reactions: { emoji, userId: senderId, timestamp: new Date() },
                },
              },
            );
          } else if (action === "remove") {
            await Message.updateOne(
              { messageId },
              { $pull: { reactions: { emoji, userId: senderId } } },
            );
          }

          // Update the message in Redis cache
          const keys = [
            `chat:${senderId}:${receiverId}`,
            `chat:${receiverId}:${senderId}`,
          ];
          for (const key of keys) {
            const messages = await redisClient.lRange(key, 0, -1);
            if (!messages || messages.length === 0) continue;

            const updatedMessages = messages.map((msg) => {
              const parsedMsg = JSON.parse(msg);
              if (parsedMsg.messageId === messageId) {
                if (action === "add") {
                  parsedMsg.reactions = parsedMsg.reactions || [];
                  parsedMsg.reactions.push({
                    emoji,
                    userId: senderId,
                    timestamp: new Date().toISOString(),
                  });
                } else if (action === "remove") {
                  parsedMsg.reactions = (parsedMsg.reactions || []).filter(
                    (r) => !(r.emoji === emoji && r.userId === senderId),
                  );
                }
              }
              return JSON.stringify(parsedMsg);
            });
            for (let i = 0; i < updatedMessages.length; i++) {
              await redisClient.lSet(key, i, updatedMessages[i]);
            }
          }

          // Broadcast reaction update to sender and receiver
          const reactionData = {
            type: "reaction",
            messageId,
            emoji,
            userId: senderId,
            action,
          };
          const senderWs = users.get(senderId);
          const receiverWs = users.get(receiverId);
          if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            senderWs.send(JSON.stringify(reactionData));
          }
          if (receiverWs && receiverWs.readyState === WebSocket.OPEN) {
            receiverWs.send(JSON.stringify(reactionData));
          }
          console.log(
            `Reaction ${action} by ${senderId} on message ${messageId}: ${emoji}`,
          );
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    });

    // Handle individual client disconnection
    ws.on("close", async (code, reason) => {
      console.log(
        `Client disconnected - Code: ${code}, Reason: ${reason.toString()}`,
      );
      // IMPORTANT: DO NOT clearInterval(heartbeatInterval) here.
      // The global heartbeat interval should only be cleared when the WSS server itself closes.

      let disconnectedSenderId = null;
      // Find the disconnected user and remove them from the 'users' map
      for (let [senderId, userWs] of users) {
        if (userWs === ws) {
          disconnectedSenderId = senderId;
          users.delete(senderId);
          break;
        }
      }

      if (disconnectedSenderId) {
        console.log(`User ${disconnectedSenderId} disconnected`);
        // Mark user as offline in Redis (or remove their online status)
        await redisClient.setEx(`online:${disconnectedSenderId}`, 45, "false");
      }

      // Notify other connected users about the status change
      const statusMessage = JSON.stringify({
        type: "status",
        userId: disconnectedSenderId,
        status: "offline",
      });

      for (const [_, userWs] of users) {
        if (userWs.readyState === WebSocket.OPEN) {
          userWs.send(statusMessage);
        }
      }
    });

    // Handle errors specific to this client connection
    ws.on("error", (error) => {
      console.error("WebSocket client error:", error);
    });
  });
};
