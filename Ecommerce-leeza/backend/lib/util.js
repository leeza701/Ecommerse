import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import redis from "./redis.js";

dotenv.config();
export const generateToken = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};


export const storeRefreshToken = async (userId, refreshToken) => {
  if (!redis) {
    console.log("Redis not available, skipping refresh token storage");
    return;
  }

  try {
    if (!redis) return;
    await redis.set(
      `refresh_token:${userId}`,
      refreshToken,
      "EX",
      7 * 24 * 60 * 60 
    );
  } catch (error) {
    console.error("Error storing refresh token in Redis:", error.message);
  }
};

export const setCookie = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    maxAge: 15 * 60 * 1000,
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });

  res.cookie("refreshToken", refreshToken, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
  });
};