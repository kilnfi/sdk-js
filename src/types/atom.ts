export type AtomStake = {
  validator_address: string;
  delegator_address: string;
  delegated_at?: string;
  undelegated_at?: string;
  balance: string;
  rewards: string;
  available_rewards: string;
  net_apy: number;
  updated_at?: string;
};

export type AtomStakes = {
  data: AtomStake[];
};

export type AtomReward = {
  date: string;
  rewards: string;
  balance: string;
  net_apy: number;
};

export type AtomRewards = {
  data: AtomReward[];
};