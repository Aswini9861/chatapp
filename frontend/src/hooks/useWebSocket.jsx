import { useWebSocketContext } from "../context/WebSocketContext";

const useWebSocket = (userId) => {
  return useWebSocketContext();
};

export default useWebSocket;
