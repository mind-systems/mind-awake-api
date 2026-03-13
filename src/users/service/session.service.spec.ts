import { SessionService } from './session.service';
import { createHash } from 'crypto';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

describe('SessionService', () => {
  let service: SessionService;
  let repo: jest.Mocked<any>;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };

    service = new (SessionService as any)(repo);
  });

  describe('create', () => {
    it('saves a new session with hashed token', async () => {
      const token = 'my-jwt';
      const userId = 'user-1';
      const tokenHash = hash(token);
      const session = { userId, tokenHash };
      repo.create.mockReturnValue(session);

      await service.create(token, userId);

      expect(repo.create).toHaveBeenCalledWith({ userId, tokenHash });
      expect(repo.save).toHaveBeenCalledWith(session);
    });
  });

  describe('isValid', () => {
    it('returns false when no session found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.isValid('unknown-token');

      expect(result).toBe(false);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it('returns true and updates lastSeenAt when session exists', async () => {
      const session = { id: 'sess-1', tokenHash: hash('valid-token') };
      repo.findOne.mockResolvedValue(session);

      const result = await service.isValid('valid-token');

      expect(result).toBe(true);
      expect(repo.update).toHaveBeenCalledWith(
        'sess-1',
        expect.objectContaining({ lastSeenAt: expect.any(Date) }),
      );
    });

    it('looks up by correct hash', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.isValid('token-abc');

      expect(repo.findOne).toHaveBeenCalledWith({ where: { tokenHash: hash('token-abc') } });
    });
  });

  describe('revoke', () => {
    it('deletes session by token hash', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });

      await service.revoke('some-token');

      expect(repo.delete).toHaveBeenCalledWith({ tokenHash: hash('some-token') });
    });

    it('does not throw when session does not exist', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.revoke('ghost-token')).resolves.not.toThrow();
    });
  });
});
