import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { isRetryablePrismaError, type RetryOptions, withRetry } from './retry.ts';

const createPrismaError = (code: string) => Object.assign(new Error(`Prisma error ${code}`), { code });
const createPrismaInitError = () =>
	Object.assign(new Error('Connection failed'), { name: 'PrismaClientInitializationError' });

describe('retry', () => {
	describe('isRetryableError', () => {
		const retryableCodes = ['ENOTBEGUN', 'P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2034'];
		const nonRetryableCodes = ['P2002', 'P2003', 'P2025'];

		retryableCodes.forEach((code) => {
			it(`returns true for ${code}`, () => {
				assert.strictEqual(isRetryablePrismaError(createPrismaError(code)), true);
			});
		});

		it('returns true for PrismaClientInitializationError', () => {
			assert.strictEqual(isRetryablePrismaError(createPrismaInitError()), true);
		});

		nonRetryableCodes.forEach((code) => {
			it(`returns false for ${code}`, () => {
				assert.strictEqual(isRetryablePrismaError(createPrismaError(code)), false);
			});
		});

		it('returns false for generic Error', () => {
			assert.strictEqual(isRetryablePrismaError(new Error('generic')), false);
		});

		it('returns false for null/undefined', () => {
			assert.strictEqual(isRetryablePrismaError(null), false);
			assert.strictEqual(isRetryablePrismaError(undefined), false);
		});
	});

	describe('withRetry', () => {
		// @ts-ignore
		const optionTests: { options: RetryOptions; name: string; error?: Error }[] = [
			{
				name: '0 max attempts',
				options: {
					maxAttempts: 0
				},
				error: new RangeError('maxAttempts must be >= 1 (received 0)')
			},
			{
				name: 'invalid base delay',
				options: {
					baseDelayMs: -1
				},
				error: new RangeError('baseDelayMs must be >= 0 (received -1)')
			},
			{
				name: 'invalid max delay',
				options: {
					baseDelayMs: 15,
					maxDelayMs: 10
				},
				error: new RangeError('maxDelayMs must be > baseDelayMs (received 10, baseDelayMs=15)')
			},
			{
				name: 'non-integer max attempts',
				options: {
					// @ts-expect-error
					maxAttempts: 'string'
				},
				error: new RangeError('maxAttempts must be >= 1 (received string)')
			},
			{
				name: 'non-integer base delay',
				options: {
					// @ts-expect-error
					baseDelayMs: 'string'
				},
				error: new RangeError('baseDelayMs must be >= 0 (received string)')
			},
			{
				name: 'non-integer max delay',
				options: {
					// @ts-expect-error
					maxDelayMs: 'string'
				},
				error: new RangeError('maxDelayMs must be > baseDelayMs (received string, baseDelayMs=100)')
			},
			{
				name: 'defaults pass',
				options: {}
			}
		];
		for (const optionTest of optionTests) {
			it(`validates options: ${optionTest.name}`, async () => {
				const operation = mock.fn(async () => 'success');

				const run = async () => await withRetry(operation, optionTest.options);

				if (optionTest.error) {
					await assert.rejects(run, optionTest.error);
				} else {
					await assert.doesNotReject(run);
				}
			});
		}

		it('returns result on first success', async () => {
			const operation = mock.fn(async () => 'success');

			const result = await withRetry(operation);

			assert.strictEqual(result, 'success');
			assert.strictEqual(operation.mock.callCount(), 1);
		});

		it('retries on retryable error and succeeds', async () => {
			let callCount = 0;
			const operation = mock.fn(async () => {
				callCount++;
				if (callCount === 1) {
					throw createPrismaError('P1001');
				}
				return 'success';
			});

			const result = await withRetry(operation, { baseDelayMs: 1 });

			assert.strictEqual(result, 'success');
			assert.strictEqual(operation.mock.callCount(), 2);
		});

		it('retries multiple times before succeeding', async () => {
			let callCount = 0;
			const operation = mock.fn(async () => {
				callCount++;
				if (callCount < 3) {
					throw createPrismaError('P1008');
				}
				return 'success';
			});

			const result = await withRetry(operation, { maxAttempts: 3, baseDelayMs: 1 });

			assert.strictEqual(result, 'success');
			assert.strictEqual(operation.mock.callCount(), 3);
		});

		it('throws after max attempts exhausted', async () => {
			const error = createPrismaError('P1001');
			const operation = mock.fn(async () => {
				throw error;
			});

			await assert.rejects(
				() => withRetry(operation, { maxAttempts: 3, baseDelayMs: 1 }),
				(thrown: Error) => {
					assert.strictEqual(thrown, error);
					return true;
				}
			);

			assert.strictEqual(operation.mock.callCount(), 3);
		});

		it('does not retry on non-retryable error', async () => {
			const error = createPrismaError('P2002');
			const operation = mock.fn(async () => {
				throw error;
			});

			await assert.rejects(
				() => withRetry(operation, { baseDelayMs: 1 }),
				(thrown: Error) => {
					assert.strictEqual(thrown, error);
					return true;
				}
			);

			assert.strictEqual(operation.mock.callCount(), 1);
		});

		it('does not retry on generic error', async () => {
			const error = new Error('generic error');
			const operation = mock.fn(async () => {
				throw error;
			});

			await assert.rejects(
				() => withRetry(operation, { baseDelayMs: 1 }),
				(thrown: Error) => {
					assert.strictEqual(thrown, error);
					return true;
				}
			);

			assert.strictEqual(operation.mock.callCount(), 1);
		});

		it('retries on PrismaClientInitializationError', async () => {
			let callCount = 0;
			const operation = mock.fn(async () => {
				callCount++;
				if (callCount === 1) {
					throw createPrismaInitError();
				}
				return 'success';
			});

			const result = await withRetry(operation, { baseDelayMs: 1 });

			assert.strictEqual(result, 'success');
			assert.strictEqual(operation.mock.callCount(), 2);
		});

		it('uses default options when none provided', async () => {
			const operation = mock.fn(async () => 'success');

			const result = await withRetry(operation);

			assert.strictEqual(result, 'success');
		});

		it('respects custom maxAttempts', async () => {
			const error = createPrismaError('P1001');
			const operation = mock.fn(async () => {
				throw error;
			});

			await assert.rejects(() => withRetry(operation, { maxAttempts: 5, baseDelayMs: 1 }));

			assert.strictEqual(operation.mock.callCount(), 5);
		});
	});
});
