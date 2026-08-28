import { ValidationException } from '../../exceptions/validation.exception';
import { RetryHelper } from '../retry.helper';

describe('RetryHelper', () => {
  it('should return result on first attempt if action succeeds', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await RetryHelper.execute(fn, { maxRetries: 3 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry operation on transient failures until success', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Transient failure 1'))
      .mockRejectedValueOnce(new Error('Transient failure 2'))
      .mockResolvedValue('success');

    const result = await RetryHelper.execute(fn, { maxRetries: 3, baseDelayMs: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should rethrow error when maxRetries attempts are exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Persistent error'));

    await expect(
      RetryHelper.execute(fn, { maxRetries: 2, baseDelayMs: 10 }),
    ).rejects.toThrow('Persistent error');

    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should NEVER retry DomainException / ValidationException', async () => {
    const fn = jest.fn().mockRejectedValue(new ValidationException('Invalid input field'));

    await expect(
      RetryHelper.execute(fn, { maxRetries: 3, baseDelayMs: 10 }),
    ).rejects.toThrow(ValidationException);

    expect(fn).toHaveBeenCalledTimes(1); // Aborted on 1st attempt
  });

  it('should respect shouldRetry predicate and abort retries immediately if predicate returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Fatal non-retryable error'));

    await expect(
      RetryHelper.execute(fn, {
        maxRetries: 3,
        baseDelayMs: 10,
        shouldRetry: (err) => (err as Error).message.includes('Transient'),
      }),
    ).rejects.toThrow('Fatal non-retryable error');

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
