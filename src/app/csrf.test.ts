import { strict as assert } from 'node:assert';
import { describe, mock, test } from 'node:test';
import { buildCsrfMiddleware } from './csrf.ts';

describe('csrf', () => {
	describe('buildCsrfMiddleware', () => {
		const mockLusca = () => {
			const middleware = mock.fn();
			return {
				lusca: {
					csrf: mock.fn(() => middleware)
				},
				middleware
			};
		};

		test('passes the allow list to lusca csrf', () => {
			const { lusca } = mockLusca();
			const bypassList = ['/health', '/status'];
			buildCsrfMiddleware(bypassList, [], lusca);

			assert.strictEqual(lusca.csrf.mock.callCount(), 1);
			assert.deepStrictEqual(lusca.csrf.mock.calls[0].arguments[0], { blocklist: bypassList });
		});

		test('returns the lusca middleware directly when there are no multipart routes', () => {
			const { middleware, lusca } = mockLusca();
			const handler = buildCsrfMiddleware([], [], lusca);

			assert.strictEqual(handler, middleware);
		});

		test('bypasses csrf for multipart POST requests matching a string route', () => {
			const { middleware, lusca } = mockLusca();
			const handler = buildCsrfMiddleware([], ['/upload'], lusca);
			const next = mock.fn();
			const req = { path: '/upload', method: 'POST', is: mock.fn(() => true) };

			handler(req, {}, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(middleware.mock.callCount(), 0);
			assert.deepStrictEqual(req.is.mock.calls[0].arguments, ['multipart/form-data']);
		});

		test('bypasses csrf for multipart POST requests matching a regex route', () => {
			const { middleware, lusca } = mockLusca();
			const handler = buildCsrfMiddleware([], [/^\/documents\/\d+\/upload$/], lusca);
			const next = mock.fn();
			const req = { path: '/documents/42/upload', method: 'POST', is: mock.fn(() => true) };

			handler(req, {}, next);

			assert.strictEqual(next.mock.callCount(), 1);
			assert.strictEqual(middleware.mock.callCount(), 0);
		});

		test('applies csrf when a multipart POST does not match any route', () => {
			const { middleware, lusca } = mockLusca();
			const handler = buildCsrfMiddleware([], ['/upload'], lusca);
			const next = mock.fn();
			const req = { path: '/other', method: 'POST', is: mock.fn(() => true) };

			handler(req, {}, next);

			assert.strictEqual(middleware.mock.callCount(), 1);
			assert.deepStrictEqual(middleware.mock.calls[0].arguments[2], next);
		});

		test('applies csrf for non-multipart POST requests to a matching route', () => {
			const { middleware, lusca } = mockLusca();
			const handler = buildCsrfMiddleware([], ['/upload'], lusca);
			const next = mock.fn();
			const req = { path: '/upload', method: 'POST', is: mock.fn(() => false) };

			handler(req, {}, next);

			assert.strictEqual(middleware.mock.callCount(), 1);
		});

		test('applies csrf for non-POST requests to a matching multipart route', () => {
			const { middleware, lusca } = mockLusca();
			const handler = buildCsrfMiddleware([], ['/upload'], lusca);
			const next = mock.fn();
			const req = { path: '/upload', method: 'GET', is: mock.fn(() => true) };

			handler(req, {}, next);

			assert.strictEqual(middleware.mock.callCount(), 1);
		});
	});
});
