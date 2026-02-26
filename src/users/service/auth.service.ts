import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { JwtPayload, RequestWithUser } from '../interfaces/auth.interface';
import { AuthResponseDto, UserResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { UserRole } from '../interfaces/user-role.enum';
import type * as admin from 'firebase-admin';
import { JwtBlacklistService } from './jwt-blacklist.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly blacklistService: JwtBlacklistService,
    @Inject(forwardRef(() => JwtAuthGuard))
    private readonly jwtAuthGuard: JwtAuthGuard,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    if (!loginDto.email) {
      throw new UnauthorizedException('Email is required');
    }
    const email = loginDto.email.toLowerCase();
    const firebase_uid = loginDto.firebase_uid;
    const name = loginDto.name;

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
            'This email is already associated with another Firebase account.',
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
              throw new InternalServerErrorException('Error creating user');
            }
            user.email = email;
            user.name = name;
            user.firebase_uid = firebase_uid;
            user = await this.userRepository.save(user);
          } else {
            throw new InternalServerErrorException('Error saving user');
          }
        }
      }
    }

    return this.generateToken(user);
  }

  async logout(req: RequestWithUser): Promise<void> {
    const token = this.jwtAuthGuard.extractToken(req);
    if (!token) return;

    const payload: any = this.jwtService.decode(token);
    if (!payload || !payload.exp) return;

    const expiresIn = Math.max(payload.exp - Math.floor(Date.now() / 1000), 0);

    await this.blacklistService.add(token, expiresIn);
    this.logger.log(`User ${payload.sub} logged out, JWT blacklisted.`);
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
    try {
      return await this.userRepository.findOne({ where: { id: userId } });
    } catch {
      return null;
    }
  }
}
