// src/middlewares/optional-auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { TokenPayload } from "../modules/auth/auth.utils.js";

export const optionalAuthenticate = (req: Request, _res: Response, next: NextFunction): void => {
  let token = req.cookies?.accessToken;

  
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
      req.user = decoded;
    } catch {
      // Token is invalid/expired; proceed as guest
    }
  }
  next();
};