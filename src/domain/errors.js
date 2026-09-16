const STATUS_BY_CODE = Object.freeze({
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500
});

class AppError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'AppError';
    this.code = STATUS_BY_CODE[code] ? code : 'INTERNAL_ERROR';
    this.status = STATUS_BY_CODE[this.code];
    this.details = details;
  }
}

module.exports = { AppError, STATUS_BY_CODE };