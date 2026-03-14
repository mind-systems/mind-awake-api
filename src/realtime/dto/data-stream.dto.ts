import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class DataStreamDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsNumber()
  timestamp: number;

  @IsNotEmpty()
  data: any;
}
