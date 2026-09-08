import { sleep } from './sleep.ts';

const RETRYABLE_PRISMA_CODES = new Set([
	'ENOTBEGUN', // transaction not begun error
	'P1001', // Can't reach database server
	'P1002', // Database server timed out
	'P1008', // Operations timed out
	'P1017', // Server closed connection
	'P2024', // Timed out fetching connection from pool
	'P2034' // Transaction conflict (write conflict/deadlock)
]);

export interface RetryOptions {
	maxAttempts?: number;
	baseDelayMs?: number;
	maxDelayMs?: number;
	isRetryableError?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxAttempts: 3,
	baseDelayMs: 100,
	maxDelayMs: 2000,
	isRetryableError: isRetryablePrismaError
};

/**
 * Wraps an async operation with retry logic for transient Prisma errors.
 * Uses exponential backoff between retries.
 *
 * @throws Error The last error if all retries are exhausted or if the error is not retryable
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const { maxAttempts, baseDelayMs, maxDelayMs, isRetryableError } = { ...DEFAULT_OPTIONS, ...options };

	if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
		throw new RangeError(`maxAttempts must be >= 1 (received ${maxAttempts})`);
	}
	if (!Number.isFinite(baseDelayMs) || baseDelayMs < 0) {
		throw new RangeError(`baseDelayMs must be >= 0 (received ${baseDelayMs})`);
	}
	if (!Number.isFinite(maxDelayMs) || maxDelayMs <= baseDelayMs) {
		throw new RangeError(`maxDelayMs must be > baseDelayMs (received ${maxDelayMs}, baseDelayMs=${baseDelayMs})`);
	}

	let lastError: Error | undefined;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;

			if (!isRetryableError(error) || attempt === maxAttempts) {
				throw error;
			}

			const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
			const jitter = delay * 0.25 * Math.random(); // 0-25% randomization
			await sleep(delay + jitter);
		}
	}

	throw lastError;
}

export function isRetryablePrismaError(error: unknown): boolean {
	if (error && typeof error === 'object') {
		if ('code' in error && typeof error.code === 'string') {
			return RETRYABLE_PRISMA_CODES.has(error.code);
		}
		if ('name' in error && error.name === 'PrismaClientInitializationError') {
			return true;
		}
	}
	return false;
}
