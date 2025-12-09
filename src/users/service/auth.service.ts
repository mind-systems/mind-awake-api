import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { AuthResponse, JwtPayload } from '../interfaceis/auth-interfaceis';
import { RegisterDto } from '../dto/register-user.dto';
import type * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, name, firebase_uid } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { firebase_uid }],
    });

    if (existingUser) {
      throw new ConflictException('Такой пользователь уже существует');
    }

    const user = {
      email: email,
      name: name,
      firebase_uid: firebase_uid,
    };

    const savedUser = await this.userRepository.save(user);

    return this.generateToken(savedUser);
  }

  async login(user: admin.auth.DecodedIdToken) {
    const { email, user_id } = user;
    const firebase_uid = <string>user_id;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { firebase_uid }],
    });

    if (!existingUser) {
      throw new UnauthorizedException('Неверные учетные данные');
    }

    return this.generateToken(existingUser);
  }

  async logout(uid: string) {
    try {
      await this.firebaseAdmin.auth().revokeRefreshTokens(uid);
    } catch (error: any) {
      console.error('Firebase token verification failed:', error);
      throw new Error('Logout failed');
    }
  }

  private generateToken(user: User): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return user;
  }
}
