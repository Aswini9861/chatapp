import { useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { useState } from "react";

const CallModal = ({ localStream, remoteStream, callType, callState, onEndCall, toggleMute, toggleCamera }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleToggleMute = () => {
    toggleMute();
    setIsMuted((prev) => !prev);
  };

  const handleToggleCamera = () => {
    toggleCamera();
    setIsCameraOff((prev) => !prev);
  };

  if (!callState) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center">
      {callState === "calling" && (
        <p className="text-white text-xl mb-6 animate-pulse">Calling...</p>
      )}

      {/* Video streams */}
      {callType === "video" && (
        <div className="relative w-full max-w-3xl aspect-video bg-gray-900 rounded-xl overflow-hidden">
          {/* Remote video (full) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Local video (picture-in-picture) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 w-32 h-24 rounded-lg object-cover border-2 border-white"
          />
        </div>
      )}

      {/* Audio-only UI */}
      {callType === "audio" && (
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
            🎙️
          </div>
          <p className="text-white text-lg">
            {callState === "in-call" ? "In call..." : "Connecting..."}
          </p>
          {/* Hidden audio element for remote audio */}
          <audio ref={remoteVideoRef} autoPlay />
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-6 mt-6">
        <button
          onClick={handleToggleMute}
          className={`p-4 rounded-full ${isMuted ? "bg-red-500" : "bg-gray-600"} text-white`}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>

        {callType === "video" && (
          <button
            onClick={handleToggleCamera}
            className={`p-4 rounded-full ${isCameraOff ? "bg-red-500" : "bg-gray-600"} text-white`}
          >
            {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </button>
        )}

        <button
          onClick={onEndCall}
          className="p-4 rounded-full bg-red-600 text-white"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default CallModal;