import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL + "?family=0");

redis.on("connect", () => {
  console.log("Connected to Redis");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redis.on("ready", () => {
  console.log("Redis client ready");
});

export default redis;
