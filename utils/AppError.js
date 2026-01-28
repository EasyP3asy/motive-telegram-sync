
export class AppError extends Error {
  constructor(message, status = 500, code = null, details = null) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
