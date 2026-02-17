import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantThemeDto } from './dto/update-tenant-theme.dto';

export type TenantTheme = {
  version: 1;
  mode: 'light' | 'dark' | 'custom';
  vars: Record<string, string>;
};

const DEFAULT_THEME: TenantTheme = {
  version: 1,
  mode: 'dark',
  vars: {},
};

const ALLOWED_VARS = new Set([
  '--primary',
  '--ring',
  '--accent',
  '--sidebar-primary',
]);

function sanitizeVars(input: Record<string, any> | undefined) {
  const out: Record<string, string> = {};
  if (!input) return out;

  for (const [k, v] of Object.entries(input)) {
    if (!ALLOWED_VARS.has(k)) continue;
    if (typeof v !== 'string') continue;

    const val = v.trim();
    if (!val) continue;

    out[k] = val;
  }

  return out;
}

@Injectable()
export class ThemeService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string): Promise<TenantTheme> {
    const t = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { theme: true },
    });

    const raw = t?.theme as Prisma.JsonValue | null | undefined;
    if (!raw) return DEFAULT_THEME;

    if (typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_THEME;

    const anyTheme = raw as Record<string, unknown>;

    const mode: TenantTheme['mode'] =
      anyTheme?.mode === 'light' || anyTheme?.mode === 'custom'
        ? (anyTheme.mode as TenantTheme['mode'])
        : 'dark';

    const vars =
      typeof anyTheme?.vars === 'object' && anyTheme.vars
        ? sanitizeVars(anyTheme.vars as Record<string, any>)
        : {};

    return { version: 1, mode, vars };
  }

  async update(
    tenantId: string,
    dto: UpdateTenantThemeDto,
  ): Promise<TenantTheme> {
    const current = await this.get(tenantId);

    const next: TenantTheme = {
      version: 1,
      mode: dto.mode ?? current.mode,
      vars: {
        ...current.vars,
        ...sanitizeVars(dto.vars),
      },
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { theme: next as unknown as Prisma.InputJsonValue },
    });

    return next;
  }

  async reset(tenantId: string): Promise<TenantTheme> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { theme: Prisma.DbNull },
    });

    return DEFAULT_THEME;
  }
}
