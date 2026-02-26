import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { getDatabaseConfig } from '../database.config';
import { AuthModule } from './users/auth.module';
import { FirebaseModule } from './firebase/firebase.module';
import { HealthController } from './health.controller';
import { BreathSessionsModule } from './breath-sessions/breath-sessions.module';
@Module({
  imports: [
    FirebaseModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Конфиг-PostgresSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    BreathSessionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
