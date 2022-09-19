export class CouldNotFetchStakeAddress extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouldNotFetchStakeAddress';
  }
}

export class CouldNotHashStakeKey extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouldNotHashStakeKey';
  }
}

export class CouldNotFetchSlot extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouldNotFetchSlot';
  }
}

export class NotEnoughFunds extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotEnoughFunds';
  }
}

export class NoStakeAddressFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoStakeAddressFound';
  }
}

export class NoRewardAddressFound extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoRewardAddressFound';
  }
}