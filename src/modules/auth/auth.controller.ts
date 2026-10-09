// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { setAuthCookies, clearAuthCookies } from "./auth.utils";
import { env } from "../../config/env";

export class AuthController {
  // GET /auth/google
  static googleLogin(_req: Request, res: Response): void {
    const url = AuthService.getGoogleAuthUrl();
    res.redirect(url);
  }

  // GET /auth/google/callback
  static async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.status(400).json({ error: "Missing authorization code" });
        return;
      }

      const { accessToken, refreshToken } = await AuthService.handleGoogleCallback(code);

      // Set HttpOnly, Secure cookies
      setAuthCookies(res, accessToken, refreshToken);

      // Redirect to frontend client
      res.redirect(env.CLIENT_URL);
    } catch (error: any) {
      console.error("Google Callback Error:", error.message);
      res.status(500).json({ error: "Authentication failed" });
    }
  }

  // POST /auth/refresh
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      
      if (!refreshToken) {
        res.status(401).json({ error: "Refresh token not found" });
        return;
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await AuthService.refreshTokens(refreshToken);

      setAuthCookies(res, accessToken, newRefreshToken);

      res.status(200).json({ message: "Tokens refreshed successfully" });
    } catch (error: any) {
      clearAuthCookies(res);
      res.status(403).json({ error: error.message || "Failed to refresh token" });
    }
  }

  // POST /auth/logout
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // Invalidate if access token was provided or if user is set
      if (req.user?.userId) {
        await AuthService.logout(req.user.userId);
      }
      clearAuthCookies(res);
      res.status(200).json({ message: "Logged out successfully" });
    } catch (error: any) {
      clearAuthCookies(res);
      res.status(500).json({ error: "Failed to logout" });
    }
  }
}