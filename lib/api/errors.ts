export class ApiError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized access") {
    super(message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden access") {
    super(message, 403);
  }
}

export class ValidationError extends ApiError {
  constructor(message: string = "Validation failed") {
    super(message, 400);
  }
}
