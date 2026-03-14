import { BreathSessionSettingsService } from './breath-session-settings.service';
import { BreathSessionSettings } from './entities/breath-session-settings.entity';

const makeSettings = (
  overrides: Partial<BreathSessionSettings> = {},
): BreathSessionSettings =>
  Object.assign(new BreathSessionSettings(), {
    id: 'settings-uuid',
    userId: 'user-uuid',
    sessionId: 'session-uuid',
    starred: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('BreathSessionSettingsService', () => {
  let service: BreathSessionSettingsService;
  let repository: jest.Mocked<any>;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      upsert: jest.fn(),
    };

    service = new BreathSessionSettingsService(repository);
  });

  describe('upsert', () => {
    it('should upsert and return settings with starred true', async () => {
      const settings = makeSettings({ starred: true });
      repository.upsert.mockResolvedValue(undefined);
      repository.findOne.mockResolvedValue(settings);

      const result = await service.upsert('user-uuid', 'session-uuid', {
        starred: true,
      });

      expect(repository.upsert).toHaveBeenCalledWith(
        { userId: 'user-uuid', sessionId: 'session-uuid', starred: true },
        { conflictPaths: ['userId', 'sessionId'] },
      );
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid', sessionId: 'session-uuid' },
      });
      expect(result.starred).toBe(true);
    });

    it('should upsert and return settings with starred false', async () => {
      const settings = makeSettings({ starred: false });
      repository.upsert.mockResolvedValue(undefined);
      repository.findOne.mockResolvedValue(settings);

      const result = await service.upsert('user-uuid', 'session-uuid', {
        starred: false,
      });

      expect(repository.upsert).toHaveBeenCalledWith(
        { userId: 'user-uuid', sessionId: 'session-uuid', starred: false },
        { conflictPaths: ['userId', 'sessionId'] },
      );
      expect(result.starred).toBe(false);
    });
  });

  describe('findByUserAndSessions', () => {
    it('should return Map keyed by sessionId', async () => {
      const s1 = makeSettings({ sessionId: 'session-1', starred: true });
      const s2 = makeSettings({ sessionId: 'session-2', starred: false });
      repository.find.mockResolvedValue([s1, s2]);

      const result = await service.findByUserAndSessions('user-uuid', [
        'session-1',
        'session-2',
      ]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('session-1')).toBe(s1);
      expect(result.get('session-2')).toBe(s2);
    });

    it('should return empty Map when no records exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findByUserAndSessions('user-uuid', [
        'session-1',
      ]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should return empty Map for empty sessionIds array', async () => {
      const result = await service.findByUserAndSessions('user-uuid', []);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(repository.find).not.toHaveBeenCalled();
    });
  });
});
