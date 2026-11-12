export interface VSFieldError {
  field?: string;
  code: string;
  message: string;
}

export class VSApiError extends Error {
  // HTTP status; 0 = network failure or timeout
  readonly status: number;

  readonly errors: VSFieldError[];

  constructor(status: number, errors: VSFieldError[], message?: string) {
    super(message ?? errors[0]?.message ?? `VS API request failed (${status})`);
    this.name = 'VSApiError';
    this.status = status;
    this.errors = errors;
  }
}

export const isVSApiError = (error: unknown): error is VSApiError => error instanceof VSApiError;
