import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { JwtBlacklist } from './entities/jwt-blacklist.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './service/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtBlacklistService } from './service/jwt-blacklist.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, JwtBlacklist]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not defined');
        }
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN');

        return {
          secret: secret,
          signOptions: {
            expiresIn: (expiresIn ?? '24h') as string | number,
          } as JwtSignOptions,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, JwtBlacklistService],
  exports: [AuthService, JwtStrategy, PassportModule, JwtAuthGuard, JwtBlacklistService, JwtModule],
})
export class AuthModule {}
