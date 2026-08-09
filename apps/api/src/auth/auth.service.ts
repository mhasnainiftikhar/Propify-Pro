import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as ms from 'ms';
import { createHmac, randomBytes } from 'crypto';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role, UserStatus } from '../../generated/prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { toSafeUser, SafeUser } from '../common/serializers/user.serializer';
import { CONFIG } from '../common/config/config.constants';
import { MailService } from '../common/mail/mail.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends TokenPair {
  user: SafeUser;
}

export interface JwtSignPayload {
  sub: string;
  email: string;
  role: Role;
  status: UserStatus;
}

const REFRESH_TOKEN_BYTES = 48;
const TOKEN_TTL_HOURS = 24;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        role: Role.USER,
        status: UserStatus.ACTIVE,
      },
    });

    await this.createEmailVerification(user);

    this.logger.log(`Registered user ${user.id}`);
    return toSafeUser(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    const tokens = await this.issueTokenPair(user);

    this.logger.log(`User ${user.id} logged in`);
    return { ...tokens, user: toSafeUser(user) };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = stored.user;
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokenPair(user);

    this.logger.log(`Rotated refresh token for user ${user.id}`);
    return tokens;
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    const tokenHash = this.hashRefreshToken(dto.refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    this.logger.log('User logged out');
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      return;
    }

    const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const tokenHash = this.hashRefreshToken(rawToken);

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: this.tokenExpiry(),
      },
    });

    const resetUrl = `${this.configService.getOrThrow<string>(CONFIG.frontendUrl)}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordReset(user.email, resetUrl);

    this.logger.log(`Created password reset token for user ${user.id}`);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashRefreshToken(dto.token);

    const reset = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Reset password for user ${reset.userId}`);
  }

  async verifyEmail(token: string): Promise<SafeUser> {
    const tokenHash = this.hashRefreshToken(token);

    const verification = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !verification ||
      verification.usedAt ||
      verification.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const now = new Date();
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: now },
      });

      return tx.user.update({
        where: { id: verification.userId },
        data: { isEmailVerified: true, emailVerifiedAt: now },
      });
    });

    this.logger.log(`Verified email for user ${user.id}`);
    return toSafeUser(user);
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const accessToken = this.signAccessToken(user);

    const rawRefreshToken =
      randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const tokenHash = this.hashRefreshToken(rawRefreshToken);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: this.tokenExpiry(),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async createEmailVerification(user: User): Promise<void> {
    const rawToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const tokenHash = this.hashRefreshToken(rawToken);

    await this.prisma.emailVerificationToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: this.tokenExpiry(),
      },
    });

    const verifyUrl = `${this.configService.getOrThrow<string>(CONFIG.frontendUrl)}/verify-email?token=${rawToken}`;
    await this.mailService.sendEmailVerification(user.email, verifyUrl);
  }

  private signAccessToken(user: User): string {
    const payload: JwtSignPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.configService.getOrThrow<string>(
        CONFIG.jwtAccessExpiresIn,
      ) as unknown as number | ms.StringValue,
      secret: this.configService.getOrThrow<string>(CONFIG.jwtAccessSecret),
    });
  }

  private hashRefreshToken(rawToken: string): string {
    const secret = this.configService.getOrThrow<string>(
      CONFIG.jwtRefreshSecret,
    );
    return createHmac('sha256', secret).update(rawToken).digest('hex');
  }

  private tokenExpiry(): Date {
    const ttlDays = Number(
      this.configService.get<string>(CONFIG.refreshTokenTtlDays, '7'),
    );
    return new Date(Date.now() + ttlDays * TOKEN_TTL_HOURS * 60 * 60 * 1000);
  }
}
