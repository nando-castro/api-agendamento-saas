import { UserRole } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  tenantId: string;
  role: UserRole;
};
