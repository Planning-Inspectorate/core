import assert from 'node:assert';
import { describe, it } from 'node:test';
import { assertSafeKey, isPrototypeKey } from './prototype.ts';

describe('prototype', () => {
	describe('isPrototypeKey', () => {
		for (const key of ['__proto__', 'constructor', 'prototype']) {
			it(`should return true for unsafe key "${key}"`, () => {
				assert.strictEqual(isPrototypeKey(key), true);
			});
		}

		for (const key of ['name', 'value', 'id', 'proto', '__proto', '']) {
			it(`should return false for safe key "${key}"`, () => {
				assert.strictEqual(isPrototypeKey(key), false);
			});
		}
	});

	describe('assertSafeKey', () => {
		for (const key of ['__proto__', 'constructor', 'prototype']) {
			it(`should throw for unsafe key "${key}"`, () => {
				assert.throws(() => assertSafeKey(key), {
					message: 'unsafe object key'
				});
			});
		}

		it('should include the label in the error message', () => {
			assert.throws(() => assertSafeKey('__proto__', 'my-field'), {
				message: 'unsafe object key for my-field'
			});
		});

		for (const key of ['name', 'value', 'id']) {
			it(`should not throw for safe key "${key}"`, () => {
				assert.doesNotThrow(() => assertSafeKey(key));
			});
		}
	});
});
