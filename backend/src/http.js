export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Minimal body validation: throws 400 listing missing required fields. */
export function requireFields(body, fields) {
  const missing = fields.filter((f) => body?.[f] === undefined || body[f] === "");
  if (missing.length) throw new HttpError(400, `Missing fields: ${missing.join(", ")}`);
}

export function asStringArray(value, field) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    throw new HttpError(400, `${field} must be an array of strings`);
  }
  return value.map((v) => v.trim()).filter(Boolean);
}
