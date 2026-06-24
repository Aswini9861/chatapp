import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addMessage,
  updateMessageStatus,
  updateMessageReaction,
} from "./chatSlice";
import {
  setUserStatuses,
  updateUserStatus,
  setTypingStatus,
  setIncomingCall,
} from "./statusesSlice";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const userId = user?._id;
  const dispatch = useDispatch();

  const [socket, setSocket] = useState(null);
  const [messageStatus, setMessageStatus] = useState({});
  const pendingMessagesRef = useRef([]);
  const heartbeatIntervalRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const webRTCSignalRef = useRef(null);

  const setWebRTCSignalHandler = useCallback((fn) => {
    webRTCSignalRef.current = fn;
  }, []);

  const clearIncomingCall = useCallback(() => {
    dispatch(setIncomingCall(null));
  }, [dispatch]);

  const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL;

  // Handle network online event to flush pending messages
  useEffect(() => {
    const handleOnline = () => {
      console.log(
        "Network is back online. Attempting to send pending messages...",
      );

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        pendingMessagesRef.current.forEach((msg) => {
          wsRef.current.send(JSON.stringify(msg));
          setMessageStatus((prev) => ({
            ...prev,
            [msg.messageId]: "sent",
          }));
        });

        pendingMessagesRef.current = [];
      }
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Handle socket connection lifecycle based on userId
  useEffect(() => {
    if (!userId) {
      if (wsRef.current) {
        console.log("User logged out, closing WebSocket connection");
        wsRef.current.close();
        wsRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    console.log("Connecting to WebSocket server for user:", userId);
    const newSocket = new WebSocket(websocketUrl);
    wsRef.current = newSocket;
    setSocket(newSocket);

    newSocket.onopen = () => {
      console.log("Connected to WebSocket server");
      setIsConnected(true);
      newSocket.send(JSON.stringify({ type: "register", senderId: userId }));

      if (pendingMessagesRef.current.length > 0) {
        console.log(
          `Retrying ${pendingMessagesRef.current.length} pending messages...`,
        );

        pendingMessagesRef.current.forEach((msg) => {
          newSocket.send(JSON.stringify(msg));
          dispatch(addMessage({ ...msg, status: "sent" }));
        });

        pendingMessagesRef.current = [];
      }
    };

    heartbeatIntervalRef.current = setInterval(() => {
      if (newSocket && newSocket.readyState === WebSocket.OPEN) {
        newSocket.send(JSON.stringify({ type: "heartbeat", senderId: userId }));
      }
    }, 25000);

    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        dispatch(addMessage(data));
      } else if (data.type === "ack") {
        dispatch(
          updateMessageStatus({
            messageId: data?.messageId,
            status: data?.status,
          }),
        );
      } else if (data.type === "status") {
        dispatch(
          updateUserStatus({ userId: data?.userId, status: data?.status }),
        );
      } else if (data.type === "statuses") {
        dispatch(setUserStatuses(data?.statuses));
      } else if (data.type === "typing") {
        dispatch(
          setTypingStatus({
            userId: data.senderId,
            isTyping: data.isTyping,
          }),
        );
      } else if (data.type === "reaction") {
        dispatch(
          updateMessageReaction({
            messageId: data.messageId,
            emoji: data.emoji,
            userId: data.userId,
            action: data.action,
          }),
        );
      } else if (data.type === "incoming-call") {
        dispatch(
          setIncomingCall({
            callerId: data.callerId,
            callType: data.callType,
          }),
        );
      } else if (
        [
          "call-accepted",
          "call-rejected",
          "offer",
          "answer",
          "ice-candidate",
          "end-call",
        ].includes(data.type)
      ) {
        console.log("Forwarding WebRTC signal, ref value:", webRTCSignalRef?.current);
        webRTCSignalRef?.current?.(data);
      }
    };

    newSocket.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason);
      setIsConnected(false);
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      newSocket.close();
      wsRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [userId, websocketUrl, dispatch]);

  const sendMessage = useCallback((targetId, currentUserName, content) => {
    if (!userId) return;
    const messageId = Date.now().toString();
    const messageData = {
      type: "message",
      senderId: userId,
      receiverId: targetId,
      content,
      timestamp: new Date().toISOString(),
      messageId,
      status: "pending",
    };

    dispatch(addMessage(messageData));
    if (
      wsRef.current &&
      wsRef.current.readyState === WebSocket.OPEN &&
      navigator.onLine
    ) {
      try {
        wsRef.current.send(JSON.stringify(messageData));
        dispatch(updateMessageStatus({ messageId, status: "sent" }));
      } catch (error) {
        console.error("Failed to send message:", error);
        pendingMessagesRef.current.push(messageData);
      }
    } else {
      pendingMessagesRef.current.push(messageData);
    }

    return messageId;
  }, [userId, dispatch]);

  const getUserStatuses = useCallback((userIds) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "getStatuses", userIds }));
    }
  }, []);

  const markMessagesAsSeen = useCallback((messages) => {
    if (!userId) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not open. Cannot mark messages as seen.");
      return;
    }
    if (messages.length === 0) return;
    const messageIds = messages.map((msg) => msg.messageId);
    const senderId = messages[0].senderId;
    wsRef.current.send(
      JSON.stringify({
        type: "mark_seen",
        messageId: messageIds,
        senderId,
        receiverId: userId,
      }),
    );
  }, [userId]);

  const sendTypingEvent = useCallback((receiverId, isTyping) => {
    if (!userId) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing",
          senderId: userId,
          receiverId,
          isTyping,
        }),
      );
    }
  }, [userId]);

  const sendReaction = useCallback((messageId, receiverId, emoji, action) => {
    if (!userId) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "reaction",
          senderId: userId,
          receiverId,
          messageId,
          emoji,
          action,
        }),
      );
    }
  }, [userId]);

  const startCall = useCallback((receiverId, callType = "video") => {
    if (!userId) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call-user",
          callerId: userId,
          receiverId,
          callType,
        }),
      );
    }
  }, [userId]);

  const acceptCall = useCallback((callerId) => {
    if (!userId) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call-accepted",
          callerId,
          receiverId: userId,
        }),
      );
    }
  }, [userId]);

  const rejectCall = useCallback((callerId) => {
    if (!userId) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "call-rejected",
          callerId,
          receiverId: userId,
        }),
      );
    }
  }, [userId]);

  const value = {
    sendMessage,
    getUserStatuses,
    markMessagesAsSeen,
    sendTypingEvent,
    sendReaction,
    startCall,
    acceptCall,
    rejectCall,
    clearIncomingCall,
    wsRef,
    setWebRTCSignalHandler,
    isConnected,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used within a WebSocketProvider");
  }
  return context;
};
