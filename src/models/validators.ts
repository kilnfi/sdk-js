export type Validator = {
  publicKey: string;
  state:
    | 'UPLOADED'
    | 'DEPLOYMENT_REVIEW'
    | 'WAITING_FOR_DEPOSIT'
    | 'PENDING'
    | 'ACTIVE'
    | 'INACTIVE'
    | 'SLASHED'
    | 'TO_BE_DELETED'
    | 'DELETION_REVIEW'
    | 'DELETING'
    | 'DELETED';
};

export type ValidatorData = Validator & {
  attestationEfficiency: number | null;
  attestationEffectiveness: number | null;
  balance: number | null;
  stateUpdatedAt: number | null;
  effectiveBalance: number | null;
  performance1d: number | null;
  performance7d: number | null;
  performance31d: number | null;
  performance365d: number | null;
};
