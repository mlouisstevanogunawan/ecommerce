// An error that carries the HTTP status a route handler should answer with.
// Lets the data/auth layer stay framework-free while API routes stay honest:
// a failed database read must surface as 500, not as a fabricated empty list.
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
