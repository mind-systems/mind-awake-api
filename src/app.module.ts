import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from '../database.config';
import { AuthModule } from './users/auth.module';
import { FirebaseModule } from './firebase/firebase.module';

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
    AuthModule,
  ],
})
export class AppModule {}
