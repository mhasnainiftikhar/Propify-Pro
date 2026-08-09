jest.mock('argon2');
jest.mock('../../generated/prisma/client', () => ({
  Role: { USER: 'USER', ADMIN: 'ADMIN' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' },
}));
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role, UserStatus } from '../../generated/prisma/client';

const now = new Date();

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_1',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: Role.USER,
    status: UserStatus.ACTIVE,
    isEmailVerified: false,
    emailVerifiedAt: null,
    twoFactorSecret: null,
    twoFactorEnabled: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    emailVerificationToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    passwordResetToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let jwtService: { sign: jest.Mock };
  let configService: {
    getOrThrow: jest.Mock;
    get: jest.Mock;
  };
  let mailService: {
    sendEmailVerification: jest.Mock;
    sendPasswordReset: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      emailVerificationToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwtService = { sign: jest.fn().mockReturnValue('signed-access-token') };
    configService = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_SECRET: 'refresh-secret',
          FRONTEND_URL: 'http://localhost:3001',
        };
        return values[key];
      }),
      get: jest.fn().mockReturnValue('7'),
    };
    mailService = {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a user with an argon2-hashed password and return safe user', async () => {
      const dto: RegisterDto = {
        email: 'user@example.com',
        password: 'StrongPass!123',
        firstName: 'John',
        lastName: 'Doe',
      };

      (argon2.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser());
      prisma.emailVerificationToken.create.mockResolvedValue({ id: 'evt_1' });

      const result = await service.register(dto);

      expect(argon2.hash).toHaveBeenCalledWith('StrongPass!123');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({
            email: 'user@example.com',
            passwordHash: 'hashed-password',
            role: Role.USER,
            status: UserStatus.ACTIVE,
          }),
        }),
      );
      expect(result).toEqual(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.not.objectContaining({ passwordHash: expect.anything() }),
      );
      expect(result.email).toBe('user@example.com');
      expect(result.role).toBe(Role.USER);
      expect(mailService.sendEmailVerification).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto: RegisterDto = {
        email: 'user@example.com',
        password: 'StrongPass!123',
      };

      prisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(service.register(dto)).rejects.toThrow(
        'Email is already registered',
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should verify password, issue token pair, and return safe user', async () => {
      const dto: LoginDto = {
        email: 'user@example.com',
        password: 'StrongPass!123',
      };

      prisma.user.findUnique.mockResolvedValue(makeUser());
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      prisma.refreshToken.create.mockResolvedValue({
        id: 'rt_1',
        tokenHash: 'hash',
        userId: 'user_1',
      });

      const result = await service.login(dto);

      expect(argon2.verify).toHaveBeenCalledWith(
        'hashed-password',
        'StrongPass!123',
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(result.accessToken).toBe('signed-access-token');
      expect(result.refreshToken).toBeTruthy();
      expect(result.user).toEqual(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expect.not.objectContaining({ passwordHash: expect.anything() }),
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const dto: LoginDto = {
        email: 'user@example.com',
        password: 'WrongPass!123',
      };

      prisma.user.findUnique.mockResolvedValue(makeUser());
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const dto: LoginDto = {
        email: 'missing@example.com',
        password: 'StrongPass!123',
      };

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
      expect(argon2.verify).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when account is suspended', async () => {
      const dto: LoginDto = {
        email: 'user@example.com',
        password: 'StrongPass!123',
      };

      prisma.user.findUnique.mockResolvedValue(
        makeUser({ status: UserStatus.SUSPENDED }),
      );
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      await expect(service.login(dto)).rejects.toThrow('Account is suspended');
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });
  });
});
