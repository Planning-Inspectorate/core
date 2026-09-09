const prototypeProperties = new Set(['__proto__', 'constructor', 'prototype']);

export function assertSafeKey(key: string, label?: string) {
	if (isPrototypeKey(key)) {
		const suffix = label ? ` for ${label}` : '';
		throw new Error(`unsafe object key${suffix}`);
	}
}

export function isPrototypeKey(key: string): boolean {
	return prototypeProperties.has(key);
}
