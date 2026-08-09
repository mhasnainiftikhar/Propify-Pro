import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'The current refresh token to rotate',
    example: 'ab12cd34ef56...',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(32)
  refreshToken: string;
}
