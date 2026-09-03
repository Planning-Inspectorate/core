import type { Configuration } from '@azure/msal-node';
import { LogLevel } from '@azure/msal-node';
import type { Logger } from 'pino';

export interface AuthConfig {
	authority: string;
	clientId: string;
	clientSecret: string;
	groups: {
		// group ID for accessing the application
		applicationAccess: string;
	};
	redirectUri: string;
	signoutUrl: string;
	// defaults to ['User.Read']
	tokenScopes?: string[];
	// defaults to 'views/errors/403'
	unauthorizedView?: string;
}

export function buildMsalConfig({ config, logger }: { config: AuthConfig; logger: Logger }): Configuration {
	return {
		auth: {
			authority: config.authority,
			clientId: config.clientId,
			clientSecret: config.clientSecret
		},
		system: {
			loggerOptions: {
				loggerCallback(logLevel: LogLevel, message: string) {
					switch (logLevel) {
						case LogLevel.Error:
							logger.error(message);
							break;

						case LogLevel.Warning:
							logger.warn(message);
							break;

						case LogLevel.Info:
							logger.info(message);
							break;

						case LogLevel.Verbose:
							logger.debug(message);
							break;

						default:
							logger.trace(message);
					}
				},
				piiLoggingEnabled: false,
				logLevel: LogLevel.Warning
			}
		}
	};
}
