export class NoAccountFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoAccountFound';
  }
}