import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../entities/user.entity';
import { UserRole } from '../interfaces/user-role.enum';
import { UpdateUserDto } from '../dto/update-user.dto';

const makeUser = (overrides: Partial<User> = {}): User =>
  new User({
    id: 'user-uuid',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    language: 'en',
    ...overrides,
  });

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<any>;

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    service = new UserService(userRepository);
  });

  describe('updateProfile', () => {
    it('returns updated UserResponseDto on happy path', async () => {
      const user = makeUser();
      const dto: UpdateUserDto = { name: 'New Name', language: 'ru' };

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, ...dto });

      const result = await service.updateProfile('user-uuid', dto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid' } });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
      expect(result.language).toBe('ru');
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('missing-uuid', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('updates only language when dto contains only language', async () => {
      const user = makeUser({ name: 'Original Name' });
      const dto: UpdateUserDto = { language: 'ru' };

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue({ ...user, language: 'ru' });

      const result = await service.updateProfile('user-uuid', dto);

      expect(result.language).toBe('ru');
      expect(result.name).toBe('Original Name');
    });
  });
});
