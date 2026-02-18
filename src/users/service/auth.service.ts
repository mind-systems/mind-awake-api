import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { JwtPayload } from '../interfaces/auth.interface';
import { AuthResponseDto, UserResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { UserRole } from '../interfaces/user-role.enum';
import type * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    const email = loginDto.email.toLowerCase();
    const firebase_uid = loginDto.firebase_uid;
    const name = loginDto.name;

    if (!email) {
      throw new UnauthorizedException('Email is required');
    }

    let user = await this.userRepository.findOne({
      where: { firebase_uid },
    });

    if (user) {
      return this.generateToken(user);
    } else {
      user = await this.userRepository.findOne({
        where: { email },
      });

      if (user) {
        if (user.firebase_uid && user.firebase_uid !== firebase_uid) {
          throw new UnauthorizedException(
            'Этот email уже привязан к другому аккаунту Firebase',
          );
        }

        user.firebase_uid = firebase_uid;
        user.name = name;
        user = await this.userRepository.save(user);
      } else {
        user = new User({
          email,
          name,
          firebase_uid,
          role: UserRole.USER,
        });

        try {
          user = await this.userRepository.save(user);
        } catch (error: any) {
          if (error.code === '23505') {
            user = await this.userRepository.findOne({
              where: [{ email }, { firebase_uid }],
            });
            if (!user) {
              throw new InternalServerErrorException('Ошибка при создании пользователя');
            }
            user.email = email;
            user.name = name;
            user.firebase_uid = firebase_uid;
            user = await this.userRepository.save(user);
          } else {
            throw new InternalServerErrorException('Ошибка при сохранении пользователя');
          }
        }
      }
    }

    return this.generateToken(user);
  }

  async logout(uid: string) {
    try {
      await this.firebaseAdmin.auth().revokeRefreshTokens(uid);
    } catch (error: any) {
      this.logger.error(`Logout failed for UID ${uid}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Logout failed');
    }
  }

  private generateToken(user: User): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);
    const userDto = new UserResponseDto(user);

    return new AuthResponseDto(accessToken, userDto);
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }
}
