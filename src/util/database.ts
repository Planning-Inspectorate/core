import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client-runtime-utils';
import type { Logger } from 'pino';

/**
 * Where clause cannot include an undefined ID, so either return a valid where clause or none
 */
export function optionalWhere(id?: string | undefined): undefined | { id: string } {
	if (id) {
		return { id };
	}
	return undefined;
}

interface WrapPrismaErrorOptions {
	error: unknown;
	logger: Logger;
	message: string;
	logParams?: Record<string, unknown>;
}

/**
 * Wrap common Prisma errors so they aren't shown to the user
 */
export function wrapPrismaError({ error, logger, message, logParams }: WrapPrismaErrorOptions) {
	// don't show Prisma errors to the user
	if (error instanceof Error) {
		// match by name to avoid issues with references to different @prisma package versions
		if (error.name === PrismaClientKnownRequestError.name) {
			logger.error({ error, ...logParams }, `error ${message}`);
			throw new Error(`Error ${message} (${(error as PrismaClientKnownRequestError).code})`);
		}
		if (error.name === PrismaClientValidationError.name) {
			logger.error({ error, ...logParams }, `error ${message}`);
			throw new Error(`Error ${message} (${error.name})`);
		}
	}
	throw error;
}
