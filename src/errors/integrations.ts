export class InvalidIntegration extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidIntegration';
  }
}

export class InvalidSignature extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSignature';
  }
}

export class BroadcastError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BroadcastError';
  }
}