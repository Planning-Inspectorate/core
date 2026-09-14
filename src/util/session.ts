import type { Request, RequestHandler } from 'express';
import session, { type SessionOptions } from 'express-session';
import type { IRedisClient } from '../redis/index.ts';
import { assertSafeKey } from './prototype.ts';

const DEFAULT_SESSION_FIELD = 'cases';

type SessionFieldData = Record<string, Record<string, unknown>>;
type SessionRecord = Record<string, SessionFieldData>;

interface InitSessionOptions extends Omit<SessionOptions, 'cookie'> {
	redis: IRedisClient | null;
	secure: boolean;
	secret: string;
	/**
	 * Defaults to 24 hours
	 */
	maxAge?: number;
}

export function initSessionMiddleware({
	redis,
	secure,
	secret,
	maxAge,
	...options
}: InitSessionOptions): RequestHandler {
	let store;
	if (redis) {
		store = redis.store;
	} else {
		store = new session.MemoryStore();
	}

	return session({
		secret: secret,
		resave: false,
		saveUninitialized: false,
		store,
		unset: 'destroy',
		cookie: {
			secure,
			sameSite: 'lax',
			maxAge: maxAge ?? 86_400_000
		},
		...options
	});
}

/**
 * Add data to a session, by id and field
 */
export function addSessionData(
	req: Request,
	id: string,
	data: Record<string, unknown>,
	sessionField: string = DEFAULT_SESSION_FIELD
) {
	if (!req.session) {
		throw new Error('request session required');
	}
	assertSafeKey(id, 'id');
	assertSafeKey(sessionField, 'sessionField');
	const session = req.session as unknown as SessionRecord;
	const field = session[sessionField] || (session[sessionField] = {});
	const fieldProps = field[id] || (field[id] = {});
	Object.assign(fieldProps, data);
}

/**
 * Read a value from the session
 */
export function readSessionData<T>(
	req: Request,
	id: string,
	field: string,
	defaultValue: T,
	sessionField: string = DEFAULT_SESSION_FIELD
): T | boolean {
	if (!req.session) {
		return false;
	}
	assertSafeKey(id, 'id');
	assertSafeKey(field, 'field');
	assertSafeKey(sessionField, 'sessionField');
	const session = req.session as unknown as SessionRecord;
	const sessionFieldData = session[sessionField] as SessionFieldData | undefined;
	const fieldProps: Record<string, unknown> = (sessionFieldData && sessionFieldData[id]) || {};
	return (fieldProps[field] as T) || defaultValue;
}

/**
 * Clear a case updated flag from the session
 */
export function clearSessionData(
	req: Request,
	id: string,
	fieldOrFields: string | string[],
	sessionField: string = DEFAULT_SESSION_FIELD
) {
	if (!req.session) {
		return; // no need to error here
	}
	assertSafeKey(id, 'id');
	assertSafeKey(sessionField, 'sessionField');
	const session = req.session as unknown as SessionRecord;
	const sessionFieldData = session[sessionField] as SessionFieldData | undefined;
	if (fieldOrFields instanceof Array) {
		fieldOrFields.forEach((field) => {
			assertSafeKey(field, 'field');
			const fieldProps: Record<string, unknown> = (sessionFieldData && sessionFieldData[id]) || {};
			delete fieldProps[field];
		});
		return;
	}

	assertSafeKey(fieldOrFields, 'fieldOrFields');
	const fieldProps: Record<string, unknown> = (sessionFieldData && sessionFieldData[id]) || {};
	delete fieldProps[fieldOrFields];
}
