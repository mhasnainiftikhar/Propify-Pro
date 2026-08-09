import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendEmailVerification(email: string, verifyUrl: string): Promise<void> {
    this.logger.log(`[email verification] to=${email} url=${verifyUrl}`);
    return Promise.resolve();
  }

  sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    this.logger.log(`[password reset] to=${email} url=${resetUrl}`);
    return Promise.resolve();
  }
}
