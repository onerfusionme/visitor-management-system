import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from './auth';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      const token = extractTokenFromHeader(authHeader);
      
      if (!token) {
        return NextResponse.json(
          { error: 'Authorization token required' },
          { status: 401 }
        );
      }

      const payload = verifyToken(token);
      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = payload;

      return await handler(authenticatedReq);
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

export function withRole(roles: UserRole[]) {
  return function <T extends (...args: any[]) => any>(handler: T): T {
    return (async (req: AuthenticatedRequest, ...args: any[]) => {
      if (!req.user) {
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        );
      }

      if (!roles.includes(req.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return await handler(req, ...args);
    }) as T;
  };
}