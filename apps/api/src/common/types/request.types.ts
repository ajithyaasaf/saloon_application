import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    // Extend Express.User with JwtPayload properties
    interface User {
      sub?: string;
      role?: UserRole;
      sessionId?: string;
      refreshToken?: string;
      iat?: number;
      exp?: number;
    }

    interface Request {
      user?: User;
      idempotencyKey?: string;
    }
  }
}
