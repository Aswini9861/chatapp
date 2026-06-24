import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import useWebSocket from "../hooks/useWebSocket";
import axios from "axios";
import { Send } from "lucide-react";
import ChatMessage from "./ChatMessage";
import ChatHeader from "./ChatHeader";
import IncomingCallModal from "./IncomingCallModal";
import useWebRTC from "./useWebRTC";
import CallModal from "./CallModal";

import { setMessages, upsertMessages } from "../context/chatSlice";
import { useSelector, useDispatch } from "react-redux";
import { FixedSizeList } from "react-window";


const ChatBox = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const webRTCSignalRef = useRef(null)

  const { sendMessage, markMessagesAsSeen, sendTypingEvent, sendReaction,startCall,acceptCall,rejectCall,clearIncomingCall,wsRef,setWebRTCSignalHandler } = useWebSocket(user?._id);
  const [inputText, setInputText] = useState("");
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const messagesEndRef = useRef(null);
  const { userStatuses, typingStatuses,incomingCall } = useSelector((state) => state.statuses);
  const { messages, selectedUser } = useSelector((state) => state.chat);

  const messagesContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false); // Track loading state
  const [hasMore, setHasMore] = useState(true); //
  const listRef = useRef(null); // Ref for FixedSizeList
  const selectedUserRef = useRef(selectedUser?._id);
 const {
    localStream, remoteStream, callState, callType,
    initiateCall, acceptIncomingCall, sendEndCall,handleSignal,
    toggleMute, toggleCamera
  } = useWebRTC(wsRef, user?._id);


  useEffect(()=>{
    setWebRTCSignalHandler(handleSignal);
  },[handleSignal, setWebRTCSignalHandler])


  useEffect(() => {
     console.log("Setting webRTCSignalRef to:", handleSignal);
  webRTCSignalRef.current = handleSignal;
}, [handleSignal]);


console.log('incoming call----',incomingCall)

  useEffect(() => {
    selectedUserRef.current = selectedUser?._id;
  }, [selectedUser?._id]);

  const typingTimeoutRef = useRef(null);



  const fetchMessages = async (lastMessageId = null) => {
    setIsLoading(true);
    const currentUserId = selectedUser?._id;

    try {
      const url = lastMessageId
        ? `${backendUrl}api/v1/redis/getcachedmessages/${user._id}/${currentUserId}/?lastMessageId=${lastMessageId}&limit=30`
        : `${backendUrl}api/v1/redis/getcachedmessages/${user._id}/${currentUserId}/?limit=30`;

      const response = await axios.get(url);

      // Prevent race condition: if user switched while fetching, ignore result
      if (currentUserId !== selectedUserRef.current) return;

      if (response?.data?.success) {
        const newMessages = response.data.messages.map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp).toISOString(),
        }));

        if (newMessages.length === 0) {
          setHasMore(false);
          return;
        }

        if (newMessages.length < 30) setHasMore(false);

        // Use upsertMessages to safely merge and sort
        dispatch(upsertMessages({ messages: newMessages }));
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      if (currentUserId === selectedUserRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleTyping = () => {
    if (!selectedUser) return;

    // Send typing start event
    sendTypingEvent(selectedUser._id, true);

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set a timeout to send typing stop event after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingEvent(selectedUser._id, false);
    }, 3000);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    handleTyping();
  };



  useEffect(() => {
    if (!selectedUser) return;

    dispatch(upsertMessages({ messages: [], reset: true })); // Clear messages when no user is selected
    setHasMore(true); // Reset hasMore when selectedUser changes
    fetchMessages(); // Initial fetch for the latest messages

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };

  }, [selectedUser?._id, user._id]);


  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container.scrollTop === 0 && !isLoading && hasMore && messages.length > 0) {
      const oldestMessageId = messages[0]?.messageId;
      const previousHeight = container.scrollHeight;
      fetchMessages(oldestMessageId).then(() => {
        if (hasMore) {
          container.scrollTop = container.scrollHeight - previousHeight;
        }
      });
    }
  };



  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      listRef.current.scrollToItem(messages.length - 1, "end"); // Scroll to bottom on new messages
    }
  }, [messages, selectedUser]);


  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedHandleScroll = debounce(handleScroll, 200);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", debouncedHandleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener("scroll", debouncedHandleScroll);
      }
    };
  }, [messages, isLoading, hasMore]);


  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current && !isLoading) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    };

    scrollToBottom();
  }, [messages, selectedUser, isLoading]); // Trigger on messages change or selectedUser change


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const seenMessages = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => ({
            messageId: entry.target.dataset.messageId,
            senderId: entry.target.dataset.senderId,
          }))
          .filter(({ senderId }) => senderId !== user._id);

        if (seenMessages.length > 0) {
          markMessagesAsSeen(seenMessages);
        }
      },
      { threshold: 0.5 }
    );

    const container = messagesContainerRef.current;
    if (container) {
      const messageElements = container.querySelectorAll(".message");
      messageElements.forEach((el) => observer.observe(el));
    }

    return () => observer.disconnect();
  }, [messages, user._id]);



  const handleSend = () => {
    if (inputText.trim() !== "") {
      sendMessage(selectedUser._id, user.username, inputText);
      setInputText("");
    }
  };

  const memoizedMessages = useMemo(() => {
    return messages
      .filter(
        (msg) =>
          (msg.senderId === user._id && msg.receiverId === selectedUser._id) ||
          (msg.senderId === selectedUser._id && msg.receiverId === user._id)
      )
      .map((msg, index) => (
        <ChatMessage
          key={`${msg.messageId}-${index}`}
          content={msg.content}
          timestamp={msg.timestamp}
          isCurrentUser={msg.senderId === user._id}
          statuses={msg.status || "sent"}
          messageId={msg.messageId}
          senderId={msg.senderId}
          className="message"
        />
      ));
  }, [messages, user._id, selectedUser._id]);


  return (

    <div className="flex flex-col h-full w-full bg-white rounded-lg shadow-lg overflow-hidden">
{incomingCall && (
  <IncomingCallModal
    callerId={incomingCall.callerId}
    callType={incomingCall.callType}
    onAccept={async() => {
      await acceptIncomingCall(incomingCall.callerId, incomingCall.callType); //
      acceptCall(incomingCall.callerId);
      clearIncomingCall();
    }}
    onReject={() => {
      rejectCall(incomingCall.callerId);
      clearIncomingCall();
    }}
  />
)}

     {/* Active call modal */}
      <CallModal
        localStream={localStream}
        remoteStream={remoteStream}
        callState={callState}
        callType={callType}
        onEndCall={() => sendEndCall(selectedUser?._id)}
        toggleMute={toggleMute}
        toggleCamera={toggleCamera}
      />
      <ChatHeader
        username={selectedUser?.username}
        status={userStatuses[selectedUser?._id] || "offline"}
        onVideoCall={() => {
          console.log("Video call clicked, selectedUser:", selectedUser?._id);
          startCall(selectedUser?._id, "video");
          initiateCall(selectedUser?._id, "video"); // 👈 start WebRTC
        }}
        onPhoneCall={() => {
          console.log("Phone call clicked, selectedUser:", selectedUser?._id);
          startCall(selectedUser?._id, "audio");
          initiateCall(selectedUser?._id, "audio"); // 👈 start WebRTC
        }}
      />
      <div ref={messagesContainerRef} className="flex-grow overflow-y-auto p-4 bg-chat-container">
        {isLoading && <div>Loading older messages...</div>}
        <div className="space-y-1">
          {memoizedMessages}

          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-3 border-t bg-white">
        {typingStatuses[selectedUser?._id] && (
          <div className="text-gray-500 text-sm italic flex items-center gap-1">
            {selectedUser?.username} is typing

            <span className="animate-bounce1">.</span>
            <span className="animate-bounce2">.</span>
            <span className="animate-bounce3">.</span>
          </div>
        )}
        <div className="flex items-center gap-2 bg-gray-50 rounded-full pr-2 pl-4 shadow-sm border focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-200">
          <input
            type="text"
            placeholder="Type your message..."
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-grow py-3 bg-transparent focus:outline-none text-gray-700"
          />
          <button
            onClick={handleSend}
            disabled={inputText.trim() === ""}
            className={`p-2 rounded-full transition-colors ${inputText.trim() === "" ? "text-gray-400 cursor-not-allowed" : "text-white bg-indigo-600 hover:bg-indigo-700"
              }`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>

  );
};

export default ChatBox;

