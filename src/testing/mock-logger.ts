import { mock } from 'node:test';
import type { BaseLogger } from 'pino';

export function mockLogger(): BaseLogger {
	return {
		get msgPrefix(): string | undefined {
			return undefined;
		},
		level: 'debug',
		silent: mock.fn(),
		trace: mock.fn(),
		info: mock.fn(),
		debug: mock.fn(),
		warn: mock.fn(),
		error: mock.fn(),
		fatal: mock.fn()
	};
}
