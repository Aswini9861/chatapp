import { createClient } from "redis";

const redisClient = createClient({
  socket: {
    host: "localhost", // Change to 'redis' if using Docker Compose
    port: 6379
  }
});

redisClient.on("connect", () => console.log("🚀 Redis connected".bgBlue.green));
redisClient.on("error", (err) => console.error("❌ Redis Error:", err));

await redisClient.connect(); // Ensure the client is connected

export default redisClient;
