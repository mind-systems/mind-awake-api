import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Ivan Ivanov' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Firebase-ID-Token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'j0KGIWGWaUUddRHdSH3VbyqgSAp2' })
  @IsString()
  @IsNotEmpty()
  firebase_uid: string;
}
