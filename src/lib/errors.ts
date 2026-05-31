export class AppError extends Error {
  statusCode: number;
  data?: Record<string, unknown>;

  constructor(message: string, statusCode: number = 400, data?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.data = data;
  }
}
