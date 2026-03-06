import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { JwtPayload, RequestWithUser } from '../interfaces/auth.interface';
import { AuthResponseDto, UserResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { UserRole } from '../interfaces/user-role.enum';
import { JwtBlacklistService } from './jwt-blacklist.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly blacklistService: JwtBlacklistService,
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    if (!loginDto.email) {
      throw new UnauthorizedException('Email is required');
    }
    const email = loginDto.email.toLowerCase();
    const name = loginDto.name;

    this.logger.debug(`login called for email=${email}`);

    let user = await this.userRepository.findOne({
      where: { email },
    });

    if (user) {
      user.name = name;
      user = await this.userRepository.save(user);
      this.logger.debug(`Existing user updated, userId=${user.id}`);
    } else {
      user = new User({
        email,
        name,
        role: UserRole.USER,
      });

      try {
        user = await this.userRepository.save(user);
        this.logger.debug(`New user created, userId=${user.id}`);
      } catch (error: any) {
        if (error.code === '23505') {
          user = await this.userRepository.findOne({
            where: { email },
          });
          if (!user) {
            throw new InternalServerErrorException('Error creating user');
          }
          this.logger.debug(`Race condition resolved, found existing userId=${user.id}`);
        } else {
          throw new InternalServerErrorException('Error saving user');
        }
      }
    }

    return this.generateToken(user);
  }

  async logout(req: RequestWithUser): Promise<void> {
    const authHeader = req.headers?.authorization as string | undefined;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (!token) return;

    const payload = this.jwtService.decode(token) as (JwtPayload & { exp: number }) | null;
    if (!payload || !payload.exp) return;

    const expiresIn = Math.max(payload.exp - Math.floor(Date.now() / 1000), 0);

    await this.blacklistService.add(token, expiresIn);
    this.logger.log(`User ${payload.sub} logged out, JWT blacklisted.`);
  }

  generateToken(user: User): AuthResponseDto {
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
