import { Role, UserStatus } from '../../../generated/prisma/client';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  role: Role;
  status: UserStatus;
}
