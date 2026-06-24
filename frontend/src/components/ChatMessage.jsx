import { useState, useEffect, useRef, memo } from "react";
import { Check, CheckCheck, Smile } from "lucide-react";
import { useSelector } from "react-redux";
import useWebSocket from "../hooks/useWebSocket";

const ChatMessage = ({ content, timestamp, isCurrentUser, statuses, messageId, senderId, className }) => {
  const { user } = useSelector((state) => state.auth);
  const { selectedUser, messages } = useSelector((state) => state.chat);
  const { sendReaction } = useWebSocket(user?._id);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const pickerRef = useRef(null);

  // Find the message to get its reactions
  const message = messages.find((msg) => msg.messageId === messageId);
  const reactions = message?.reactions || [];

  // Available emojis for reactions
  const emojis = ["😊", "❤️", "👍", "😂", "😢"];

  // Handle adding or removing a reaction
  const handleReaction = (emoji) => {
    const existingReaction = reactions.find((r) => r.emoji === emoji && r.userId === user._id);
    const action = existingReaction ? "remove" : "add";
    sendReaction(messageId, selectedUser._id, emoji, action);
    setShowReactionPicker(false);
  };

  // Group reactions by emoji and count
  const groupedReactions = reactions.reduce((acc, { emoji, userId }) => {
    acc[emoji] = acc[emoji] || { count: 0, userIds: [] };
    acc[emoji].count += 1;
    acc[emoji].userIds.push(userId);
    return acc;
  }, {});

  // Close picker on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowReactionPicker(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowReactionPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const getStatusIcon = () => {
    if (statuses === "delivered") {
      return <CheckCheck className="h-3.5 w-3.5 text-gray-400" />;
    } else if (statuses === "sent") {
      return <Check className="h-3.5 w-3.5 text-gray-400" />;
    } else if (statuses === "seen") {
      return <CheckCheck className="h-3.5 w-3.5 text-blue-400" />;
    } else {
      return <div className="h-3 w-3 rounded-full bg-gray-300 animate-pulse" />;
    }
  };

  return (
    <div
      className={`flex flex-col mb-4 w-full ${isCurrentUser ? "items-end" : "items-start"} ${className}`}
      data-message-id={messageId}
      data-sender-id={senderId}
    >
      <div
        className={`relative px-4 py-3 rounded-2xl shadow-sm max-w-[90%] md:max-w-[75%] animate-scale-in group ${
          isCurrentUser
            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-none"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(groupedReactions).map(([emoji, { count, userIds }]) => (
              <div
                key={emoji}
                className={`flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-sm cursor-pointer transition-transform hover:scale-110 ${
                  userIds.includes(user._id) ? "border border-indigo-500" : ""
                }`}
                onClick={() => handleReaction(emoji)}
                title={userIds.join(", ")}
              >
                <span className="text-base">{emoji}</span>
                {count > 1 && <span className="ml-1 text-xs">{count}</span>}
              </div>
            ))}
          </div>
        )}
        {/* Reaction picker */}
        <div
          className={`absolute top-1 ${
            isCurrentUser ? "right-1" : "left-1"
          } opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
            aria-label="Toggle reaction picker"
          >
            <Smile className="h-4 w-4 text-gray-600" />
          </button>
          {showReactionPicker && (
            <div
              ref={pickerRef}
              className={`absolute ${
                isCurrentUser ? "right-0" : "left-0"
              } mt-2 p-2 bg-white border rounded-lg shadow-lg flex gap-2 z-10 animate-fade-in`}
            >
              {emojis.map((emoji) => {
                const hasReacted = reactions.some((r) => r.emoji === emoji && r.userId === user._id);
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={`text-lg rounded p-1 transition-colors ${
                      hasReacted ? "bg-indigo-100 text-indigo-600" : "hover:bg-gray-100 text-gray-800"
                    }`}
                    aria-label={`React with ${emoji}`}
                    tabIndex={0}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div
        className={`flex items-center mt-1 text-xs ${
          isCurrentUser ? "text-gray-600 mr-1" : "text-gray-500 ml-1"
        }`}
      >
        <span>{formattedTime}</span>
        {isCurrentUser && <span className="flex items-center ml-1.5">{getStatusIcon()}</span>}
      </div>
    </div>
  );
};

export default memo(ChatMessage, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.timestamp === nextProps.timestamp &&
    prevProps.isCurrentUser === nextProps.isCurrentUser &&
    prevProps.statuses === nextProps.statuses &&
    prevProps.messageId === nextProps.messageId
  );
});