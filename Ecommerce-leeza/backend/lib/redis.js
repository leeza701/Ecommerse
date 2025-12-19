import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

let redis = null;

try {
  if (process.env.UPSTASH_REDIS_URL) {
    redis = new Redis(process.env.UPSTASH_REDIS_URL);
    console.log("Redis connected successfully");
  } else {
    console.log("UPSTASH_REDIS_URL not set, Redis features will be disabled");
  }
} catch (error) {
  console.error("Redis connection error:", error.message);
  redis = null;
}

export { redis };
export default redis;
