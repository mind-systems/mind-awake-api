import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ example: '123456', description: '6-digit authentication code' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
