export class InvalidStakeAmount extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStakeAmount';
  }
}

export class NotEnoughKeysProvided extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotEnoughKeysProvided';
  }
}