import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const slug = dto.tenantSlug.trim().toLowerCase();

    const tenantExists = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (tenantExists) throw new BadRequestException('Slug já está em uso.');

    const email = dto.adminEmail.trim().toLowerCase();
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) throw new BadRequestException('E-mail já está em uso.');

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.tenantName.trim(),
        slug,
        users: {
          create: {
            name: dto.adminName.trim(),
            email,
            passwordHash,
            role: UserRole.ADMIN,
          },
        },
      },
      include: { users: true },
    });

    const admin = tenant.users[0];
    return this.issueToken(admin.id, tenant.id, admin.role);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas.');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas.');

    return this.issueToken(user.id, user.tenantId, user.role);
  }

  private async issueToken(userId: string, tenantId: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, tenantId, role };

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');

    const signOptions: JwtSignOptions = {
      secret,
      expiresIn: (process.env.JWT_EXPIRES_IN ??
        '7d') as JwtSignOptions['expiresIn'],
    };

    const accessToken = await this.jwt.signAsync(
      payload as Record<string, unknown>,
      signOptions,
    );

    return { accessToken };
  }
}
