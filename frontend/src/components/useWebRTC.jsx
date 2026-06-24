import { useRef, useState, useEffect, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const useWebRTC = (wsRef, userId) => {
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState(null); // null | "calling" | "in-call"
  const [callType, setCallType] = useState(null); // "audio" | "video"
  const remoteStreamRef = useRef(new MediaStream());
  const remoteUserIdRef = useRef(null);

  // Listen for WebRTC signaling messages from WebSocket
  // useEffect(() => {
  //   if (!wsRef.current) return;

  //   const originalOnMessage = wsRef.current.onmessage;

  //   wsRef.current.onmessage = (event) => {
  //     const data = JSON.parse(event.data);

  //     if (data.type === "offer") {
  //       handleReceiveOffer(data.offer, data.senderId);
  //     } else if (data.type === "answer") {
  //       handleReceiveAnswer(data.answer);
  //     } else if (data.type === "ice-candidate") {
  //       handleReceiveICECandidate(data.candidate);
  //     } else if (data.type === "call-accepted") {
  //       handleCallAccepted(data.receiverId);
  //     } else if (data.type === "end-call") {
  //       endCall();
  //     } else {
  //       // Pass to original handler for other message types
  //       if (originalOnMessage) originalOnMessage(event);
  //     }
  //   };
  // }, [wsRef.current]);

  const createPeerConnection = (remoteUserId) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    remoteUserIdRef.current = remoteUserId;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Send ICE candidates to remote peer via WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "ice-candidate",
            senderId: userId,
            receiverId: remoteUserId,
            candidate: event.candidate,
          }),
        );
      }
    };

    // Receive remote stream tracks
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });
      setRemoteStream(remoteStreamRef.current);
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        endCall();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  const getLocalMedia = async (type) => {
    const constraints = {
      audio: true,
      video: type === "video" ? { width: 1280, height: 720 } : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  };

  // CALLER: initiate call after call-accepted signal
  const handleCallAccepted = async (receiverId) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    wsRef.current.send(
      JSON.stringify({
        type: "offer",
        senderId: userId,
        receiverId,
        offer,
      }),
    );
    setCallState("in-call");
  };

  // CALLEE: receive offer, send answer
  const handleReceiveOffer = async (offer, callerId) => {
    const pc = createPeerConnection(callerId);

    // Add local tracks to connection
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    wsRef.current.send(
      JSON.stringify({
        type: "answer",
        senderId: userId,
        receiverId: callerId,
        answer,
      }),
    );
    setCallState("in-call");
  };

  const handleReceiveAnswer = async (answer) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  };

  const handleReceiveICECandidate = async (candidate) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("Error adding ICE candidate:", e);
    }
  };

  const addTracksToPC = (pc, stream) => {
    const senders = pc.getSenders().map((s) => s.track);
    stream.getTracks().forEach((track) => {
      if (!senders.includes(track)) {
        // 👈 prevent duplicate add
        pc.addTrack(track, stream);
      }
    });
  };

  // Called when user clicks call button
  const initiateCall = async (receiverId, type = "video") => {
    setCallType(type);
    setCallState("calling");
    remoteUserIdRef.current = receiverId;

    const stream = await getLocalMedia(type);
    const pc = createPeerConnection(receiverId);
    addTracksToPC(pc, stream);
    // Add tracks BEFORE sending offer (after call-accepted)
  };

  // CALLEE: clicks accept
  const acceptIncomingCall = async (callerId, type = "video") => {
    console.log("Accepting call from", callerId, type);
    setCallType(type);
    setCallState("in-call");
    remoteUserIdRef.current = callerId;

    const stream = await getLocalMedia(type);
    localStreamRef.current = stream;
    // PC will be created when offer arrives in handleSignal
  };

  // Central handler — called from useWebSocket via onWebRTCSignal callback
  const handleSignal = useCallback(
    async (data) => {
      console.log("WebRTC signal received:", data.type, data);

      if (data.type === "call-accepted") {
        console.log("data", data);
        // CALLER side: other person accepted, now create and send offer
        const pc = peerConnectionRef.current;
        if (!pc) {
          console.error("No peer connection found when call was accepted");
          return;
        }

        const receiverId = data.receiverId || remoteUserIdRef.current;
          console.log("Sending offer to receiverId:", receiverId);

          if (!receiverId) {
            console.error("receiverId is missing — cannot send offer");
            return;
          }
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          wsRef.current.send(
            JSON.stringify({
              type: "offer",
              senderId: userId,
              receiverId,
              offer,
            }),
          );
          setCallState("in-call");
        } catch (e) {
          console.error("Error creating offer:", e);
        }
      } else if (data.type === "offer") {
        // CALLEE side: received offer, create answer
        const callerId = data.senderId;
        const pc = createPeerConnection(callerId);

        // Add local tracks before setting remote description
        const stream = localStreamRef.current;
        if (stream) {
          addTracksToPC(pc, stream);
        } else {
          console.warn("No local stream when offer received");
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          wsRef.current.send(
            JSON.stringify({
              type: "answer",
              senderId: userId,
              receiverId: callerId,
              answer,
            }),
          );
        } catch (e) {
          console.error("Error handling offer:", e);
        }
      } else if (data.type === "answer") {
        // CALLER side: received answer
        const pc = peerConnectionRef.current;
        if (!pc) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        } catch (e) {
          console.error("Error setting remote description:", e);
        }
      } else if (data.type === "ice-candidate") {
        const pc = peerConnectionRef.current;
        if (!pc) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ICE candidate:", e);
        }
      } else if (data.type === "call-rejected") {
        endCall();
      } else if (data.type === "end-call") {
        endCall();
      }
    },
    [userId, wsRef],
  );

  const endCall = () => {
    // Stop all local tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerConnectionRef.current?.close();

    peerConnectionRef.current = null;
    localStreamRef.current = null;
    remoteStreamRef.current = new MediaStream();

    setLocalStream(null);
    setRemoteStream(null);
    setCallState(null);
    setCallType(null);
  };

  const sendEndCall = (receiverId) => {
    wsRef.current?.send(
      JSON.stringify({
        type: "end-call",
        senderId: userId,
        receiverId,
      }),
    );
    endCall();
  };

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = !audioTrack.enabled;
  };

  const toggleCamera = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) videoTrack.enabled = !videoTrack.enabled;
  };

  return {
    localStream,
    remoteStream,
    callState,
    callType,
    handleSignal,
    initiateCall,
    acceptIncomingCall,
    sendEndCall,
    toggleMute,
    toggleCamera,
  };
};

export default useWebRTC;
