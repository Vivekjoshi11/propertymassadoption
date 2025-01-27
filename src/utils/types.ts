

export type AddressesToMint = {
    id: number;
    address: string;
    owner: {
        blockchainAddress: string;
    };
    longitude: number;
    latitude: number;
};

export type Signatures = {
    id: number;
    address: string;
    owner: {
        blockchainAddress: string;
    };
    longitude: number;
    latitude: number;
    signature: string;
    confirmed: boolean;
    layerAdded: boolean;
};

export type RetryEntry = AddressesToMint & {
    signature: string | null;
    status: 'failed' | 'success';
    createdAt: string;
};

export type RecheckEntry = RetryEntry;

export interface FailedTx {
    id: string;
    address: string;
    owner: {
        blockchainAddress: string;
    };
    signature: string | null;
    createdAt: string;
}
