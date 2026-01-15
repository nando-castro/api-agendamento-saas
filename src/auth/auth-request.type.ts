import type { Request } from 'express';
import type { JwtPayload } from './jwt-payload';

export type AuthenticatedRequest = Request & {
  user: JwtPayload;
};
