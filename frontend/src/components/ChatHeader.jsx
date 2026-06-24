import * as Avatar from "@radix-ui/react-avatar";
import { Video, PhoneCall } from "lucide-react";

const ChatHeader = ({
  username,
  status = "offline",
  onVideoCall = () => console.log("Video call initiated"),
  onPhoneCall = () => console.log("Phone call initiated")
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3">
        <Avatar.Root className="inline-flex items-center justify-center bg-gray-200 rounded-full w-10 h-10">
          <Avatar.Image
            className="rounded-full"
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${username}`}
            alt={username}
          />
          <Avatar.Fallback className="text-gray-800 font-bold">
            {username?.charAt(0)?.toUpperCase()}
          </Avatar.Fallback>
        </Avatar.Root>

        <div>
          <h2 className="font-semibold text-lg">{username}</h2>
          <p className={`text-sm ${status === "online" ? "text-green-500" : "text-gray-500"}`}>
            {status === "online" ? "Online" : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {/* 👇 plain buttons — no MUI */}
        <button
          onClick={onVideoCall}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Video call"
        >
          <Video className="h-5 w-5 text-gray-600" />
        </button>
        <button
          onClick={onPhoneCall}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Phone call"
        >
          <PhoneCall className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;