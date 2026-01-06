class ApiError extends Error {
  status: number;
  isOperational: boolean;

  constructor(
    status: number,
    message: string,
    isOperational = true,
    stack = ""
  ) {
    super(message);

    this.status = status;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace?.(this, this.constructor);
    }
  }
}

export default ApiError;
