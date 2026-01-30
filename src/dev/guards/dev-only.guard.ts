// src/dev/guards/dev-only.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class DevOnlyGuard implements CanActivate {
  canActivate(_ctx: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Dev endpoints desabilitados em produção.');
    }
    return true;
  }
}
