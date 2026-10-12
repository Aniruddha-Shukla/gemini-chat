// An error that maps directly to an HTTP response. Throw it anywhere in a
// request handler and the central error handler turns it into JSON.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
