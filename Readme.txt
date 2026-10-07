// AUTH FLOW 


Set up a PostgreSQL database using [Insert ORM, e.g., Prisma / TypeORM / SQLAlchemy].

Create a user model/table to manage login user state, storing at minimum: id, email, google_id, created_at, and hashed refresh_token.

Implement Google OAuth authentication using JWTs with the following requirements:

Tokens: Issue a 5-minute Access Token and a 7-day Refresh Token.

Cookies: Send both tokens from the server via HTTP-only, secure cookies (HttpOnly, Secure, SameSite=Lax).

Endpoints:

/auth/google & /auth/google/callback for Google OAuth login.

/auth/refresh to verify the stored refresh token against the DB and issue a new access/refresh token pair.

/auth/logout to clear cookies and invalidate the stored refresh token.

Add middleware to authenticate incoming requests using the access token.