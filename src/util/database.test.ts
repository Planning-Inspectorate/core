// @ts-nocheck
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client-runtime-utils';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import { mockLogger } from '../testing/mock-logger.ts';
import { optionalWhere, wrapPrismaError } from './database.ts';

describe('database', () => {
	describe('optionalWhere', () => {
		it('should return undefined if no id', () => {
			const result = optionalWhere();
			assert.strictEqual(result, undefined);
		});
		it('should return where clause if id', () => {
			const result = optionalWhere('id-1');
			assert.deepStrictEqual(result, { id: 'id-1' });
		});
	});
	describe('wrapPrismaError', () => {
		it('should re-throw non-Prisma errors', () => {
			const error = new Error('Some other error');
			const logger = mockLogger();
			assert.throws(
				() =>
					wrapPrismaError({
						error,
						logger,
						message: 'updating case'
					}),
				(err) => {
					assert.strictEqual(err, error);
					assert.strictEqual(err.name, 'Error');
					return true;
				}
			);
		});
		it('should not throw Prisma client errors', () => {
			const error = new PrismaClientKnownRequestError('E101', {
				code: '123'
			});
			const logger = mockLogger();
			assert.throws(
				() =>
					wrapPrismaError({
						error,
						logger,
						message: 'updating case'
					}),
				(err) => {
					assert.strictEqual(err instanceof PrismaClientKnownRequestError, false);
					assert.strictEqual(err.name, 'Error');
					assert.match(err.message, /Error updating case/);
					assert.match(err.message, /\(123\)/);

					assert.strictEqual(logger.error.mock.callCount(), 1);
					const loggerArgs = logger.error.mock.calls[0].arguments;
					// should log the original error
					assert.strictEqual(loggerArgs[0].error, error);
					assert.strictEqual(loggerArgs[1], 'error updating case');
					return true;
				}
			);
		});
		it('should not throw Prisma validation errors', () => {
			const error = new PrismaClientValidationError('E101', {});
			const logger = mockLogger();
			assert.throws(
				() =>
					wrapPrismaError({
						error,
						logger,
						message: 'updating case'
					}),
				(err) => {
					assert.strictEqual(err instanceof PrismaClientValidationError, false);
					assert.strictEqual(err.name, 'Error');
					assert.match(err.message, /Error updating case/);
					return true;
				}
			);
		});
		it('should not throw errors with name PrismaClientValidationError', () => {
			const error = new Error('E101');
			error.name = 'PrismaClientValidationError';
			const logger = mockLogger();
			assert.throws(
				() =>
					wrapPrismaError({
						error,
						logger,
						message: 'updating case'
					}),
				(err) => {
					assert.notStrictEqual(err, error);
					assert.strictEqual(err.name, 'Error');
					assert.match(err.message, /Error updating case/);
					return true;
				}
			);
		});
	});
});
