export class NoAccountFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoAccountFound';
  }
}

export class InvalidStakeAmount extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStakeAmount';
  }
}