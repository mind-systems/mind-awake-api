import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, Matches } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit authentication code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code: string;
}
