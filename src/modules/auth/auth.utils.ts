// src/modules/auth/auth.utils.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { CookieOptions, Response } from "express";
import { env } from "../../config/env";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: "7d", // 60 minutes
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d", // 7 days
  });

  return { accessToken, refreshToken };
};

export const hashToken = async (token: string): Promise<string> => {
  return bcrypt.hash(token, 10);
};

export const verifyHash = async (token: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(token, hash);
};

// Cookie configuration: HttpOnly, Secure, SameSite=Lax
const isProduction = env.NODE_ENV === "production";

export const ACCESS_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

export const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

export const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie("accessToken", accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken", { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
  res.clearCookie("refreshToken", { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });
};