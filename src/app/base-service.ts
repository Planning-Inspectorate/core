import type { Logger } from 'pino';
import type { RedisClient } from '../redis/index.ts';
import { initRedis } from '../redis/index.ts';
import { initLogger } from '../util/logger.ts';

export interface DatabaseConfig {
	connectionString?: string;
}

export interface BaseConfig {
	cacheControl: {
		maxAge: string;
	};
	database: DatabaseConfig;
	gitSha?: string;
	httpPort: number;
	logLevel: string;
	NODE_ENV: string;
	srcDir: string;
	session: {
		redisPrefix: string;
		redis?: string;
		secret: string;
	};
	staticDir: string;
}

/**
 * This class encapsulates all the services and clients for the application
 */
export class BaseService<T = unknown> {
	#config: BaseConfig;
	logger: Logger;
	dbClient: T;
	redisClient: RedisClient | null;

	constructor(config: BaseConfig, initDatabaseClient: (config: BaseConfig, logger: Logger) => T) {
		this.#config = config;
		const logger = initLogger(config);
		this.logger = logger;
		this.dbClient = initDatabaseClient(config, logger);
		this.redisClient = initRedis(config.session, logger);
	}

	get cacheControl() {
		return this.#config.cacheControl;
	}

	/**
	 * Alias of dbClient
	 */
	get db(): T {
		return this.dbClient;
	}

	get gitSha() {
		return this.#config.gitSha;
	}

	get secureSession() {
		return this.#config.NODE_ENV === 'production';
	}

	get sessionSecret() {
		return this.#config.session.secret;
	}

	get staticDir() {
		return this.#config.staticDir;
	}
}
