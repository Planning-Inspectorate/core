import { mock } from 'node:test';
import type { BaseLogger } from 'pino';

export interface LoggerWithChild extends BaseLogger {
	child: (...args: unknown[]) => LoggerWithChild;
}

export function mockLogger(): LoggerWithChild {
	const logger = {
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
		fatal: mock.fn(),
		child: mock.fn(() => logger)
	};
	return logger;
}
