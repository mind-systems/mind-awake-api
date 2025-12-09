import { IsEmail, IsString } from 'class-validator';

export class RegisterDto {
  @IsString()
  firebase_uid: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  token: string;
}
