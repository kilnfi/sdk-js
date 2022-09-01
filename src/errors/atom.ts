export class InvalidStakeAmount extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStakeAmount';
  }
}

export class CouldNotFetchDelegation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouldNotFetchDelegation';
  }
}