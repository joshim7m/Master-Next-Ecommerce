/**
 * Errors shared by every courier adapter.
 *
 * `CourierNotConfigured` — the provider's credentials are missing or the
 * service is disabled in Settings → Courier Services, so its dropdown option
 * stays disabled and `getCourier()` refuses to hand it out.
 *
 * `CourierError` — the courier API answered with a failure we can explain to a
 * human. `status` is the HTTP status (0 = could not reach the host), `fields`
 * carries per-field validation messages when the API sent any.
 */
export class CourierNotConfigured extends Error {
  constructor(provider) {
    super(`${provider} credentials are not configured.`);
    this.name = 'CourierNotConfigured';
    this.provider = provider;
  }
}

export class CourierError extends Error {
  constructor(provider, status, message, { code = null, fields = null } = {}) {
    super(message);
    this.name = 'CourierError';
    this.provider = provider;
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
