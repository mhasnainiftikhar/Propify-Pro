import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toSafeUser, SafeUser } from '../common/serializers/user.serializer';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserStatus } from '../../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(currentUser: AuthenticatedUser): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toSafeUser(user);
  }

  async updateProfile(
    currentUser: AuthenticatedUser,
    dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    const user = await this.prisma.user.update({
      where: { id: currentUser.sub },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    return toSafeUser(user);
  }

  async listUsers(take: number, skip: number): Promise<SafeUser[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      take,
      skip,
    });

    return users.map((user) => toSafeUser(user));
  }

  async suspendUser(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'ADMIN') {
      throw new ForbiddenException('Cannot suspend an admin user');
    }

    const suspended = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      return tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.SUSPENDED },
      });
    });

    return toSafeUser(suspended);
  }
}
