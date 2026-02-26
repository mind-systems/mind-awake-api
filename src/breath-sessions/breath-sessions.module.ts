import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BreathSessionsController } from './breath-sessions.controller';
import { BreathSessionsService } from './breath-sessions.service';
import { BreathSession } from './entities/breath-session.entity';
import { AuthModule } from 'src/users/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BreathSession]),
    AuthModule,
  ],
  controllers: [BreathSessionsController],
  providers: [BreathSessionsService],
  exports: [BreathSessionsService],
})
export class BreathSessionsModule {}