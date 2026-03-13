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
      update: jest.fn().mockResolvedValue({ affected: 0 }),
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
      repo.update.mockResolvedValue({ affected: 0 });

      const result = await service.isValid('unknown-token');

      expect(result).toBe(false);
    });

    it('returns true and updates lastSeenAt when session exists', async () => {
      repo.update.mockResolvedValue({ affected: 1 });

      const result = await service.isValid('valid-token');

      expect(result).toBe(true);
      expect(repo.update).toHaveBeenCalledWith(
        { tokenHash: hash('valid-token') },
        expect.objectContaining({ lastSeenAt: expect.any(Date) }),
      );
    });

    it('looks up by correct hash', async () => {
      repo.update.mockResolvedValue({ affected: 0 });

      await service.isValid('token-abc');

      expect(repo.update).toHaveBeenCalledWith(
        { tokenHash: hash('token-abc') },
        expect.any(Object),
      );
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
