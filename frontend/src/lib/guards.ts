// Reflect.get keeps the guards free of type assertions; the result is checked before use.
export const field = (value: object, key: string): unknown => Reflect.get(value, key);
export const isString = (value: unknown) => typeof value === "string";
export const isStringOrNull = (value: unknown) => value === null || typeof value === "string";
export const isFiniteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
