import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Server authorization code from Google Sign-In SDK' })
  @IsString()
  @IsNotEmpty()
  serverAuthCode: string;
}
