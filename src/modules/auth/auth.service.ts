// src/modules/auth/auth.service.ts
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { db } from "../../core/database";
import { env } from "../../config/env";
import {
  generateTokens,
  hashToken,
  verifyHash,
  TokenPayload,
} from "./auth.utils";

const googleClient = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI
);

export class AuthService {
  static getGoogleAuthUrl(): string {
    return googleClient.generateAuthUrl({
      access_type: "offline",
      scope: ["profile", "email"],
      prompt: "consent",
    });
  }

  static async handleGoogleCallback(code: string) {
    // 1. Exchange authorization code for Google tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // 2. Verify Google ID token and get user profile
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new Error("Unable to retrieve Google user profile");
    }

    const { email, sub: googleId } = payload;

    // 3. Upsert user in PostgreSQL
    const user = await db.user.upsert({
      where: { googleId },
      update: { email },
      create: {
        email,
        googleId,
      },
    });

    // 4. Generate access & refresh tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // 5. Hash refresh token and save to DB
    const hashedRefreshToken = await hashToken(refreshToken);
    await db.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken },
    });

    return { user, accessToken, refreshToken };
  }

  static async refreshTokens(incomingRefreshToken: string) {
    // 1. Verify token signature
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(
        incomingRefreshToken,
        env.JWT_REFRESH_SECRET
      ) as TokenPayload;
    } catch {
      throw new Error("Invalid or expired refresh token");
    }

    // 2. Fetch user from DB
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new Error("Access denied: Invalid session");
    }

    // 3. Verify incoming token against the stored hash
    const isTokenMatch = await verifyHash(
      incomingRefreshToken,
      user.hashedRefreshToken
    );
    if (!isTokenMatch) {
      // Possible token reuse attack detected: invalidate stored token immediately
      await db.user.update({
        where: { id: user.id },
        data: { hashedRefreshToken: null },
      });
      throw new Error("Token reuse detected. Session revoked.");
    }

    // 4. Issue a new pair of tokens (Token Rotation)
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const tokens = generateTokens(tokenPayload);

    // 5. Update hash in DB
    const newHashedToken = await hashToken(tokens.refreshToken);
    await db.user.update({
      where: { id: user.id },
      data: { hashedRefreshToken: newHashedToken },
    });

    return tokens;
  }

  static async logout(userId: string) {
    // Invalidate refresh token in database
    await db.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: null },
    });
  }
}