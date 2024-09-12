export type CoreStake = {
    id: string;
    tags: any;
    metadata: any;
    protocol: string;
    created_at: string;
    updated_at: string;
};
export type CoreStakes = {
    data: CoreStake[];
};
