import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

jest.mock('./../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {
    onModuleInit(): Promise<void> {
      return Promise.resolve();
    }
    onModuleDestroy(): Promise<void> {
      return Promise.resolve();
    }
  },
}));
jest.mock('./../generated/prisma/client', () => ({
  Role: { USER: 'USER', ADMIN: 'ADMIN' },
  UserStatus: { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED' },
}));

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects registration with invalid body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email' })
      .expect(400);

    const body = res.body as {
      statusCode: number;
      error: string;
      message: string;
    };
    expect(body.statusCode).toBe(400);
    expect(body.error).toBeDefined();
    expect(body.message).toBeDefined();
  });
});
