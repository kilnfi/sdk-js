export class CouldNotFindAccessKey extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouldNotFindAccessKey';
  }
}

export class CouldNotParseStakeAmount extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CouldNotParseStakeAmount';
  }
}