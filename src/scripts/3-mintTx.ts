



import { PublicKey } from '@solana/web3.js';
import { configs } from '../configs';
import {
    getMetaDataObject,
    MintTokenSendAndConfirm,
    pinFilesToIPFS,
} from '../utils/solanaHelper';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { decode } from '@coral-xyz/anchor/dist/cjs/utils/bytes/bs58';
import { umi } from '../utils/solanaHelper';

console.log("SOLANA_PUBLIC_KEY from environment:", process.env.SOLANA_PUBLIC_KEY);

type addressesToMint = {
    id: number;
    address: string;
    owner: {
        blockchainAddress: string;
    };
    longitude: number;
    latitude: number;
};

type signatures = {
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

async function checkUniqueAddress(
    addressesToMint: Array<addressesToMint>,
    allSigs: Array<signatures>
) {
    const ans: addressesToMint[] = [];
    for (const addToMint of addressesToMint) {
        const existingSig = allSigs.find(sig => sig.id === addToMint.id);

        if (!existingSig || existingSig.signature === 'failed' || !existingSig.confirmed) {
            ans.push(addToMint);
        }
    }
    return ans;
}

async function main() {
    // Load initial data
    const addressesToMint: addressesToMint[] = JSON.parse(
        readFileSync(join(__dirname, '../result/dbPropertiesTomint.json'), 'utf-8')
    );

    const successCases: any[] = [];
    let recheck: any[] = [];
    let retries: any[] = [];

    const actuallyMint = async (entry: any) => {
        try {
            // Mint token
            const pinataMetadata = await getMetaDataObject(entry.address);
            const cid = await pinFilesToIPFS(pinataMetadata);

            if (!cid) {
                retries.push({
                    ...entry,
                    signature: null,
                    status: 'failed',
                    createdAt: new Date().toISOString(),
                });
                return;
            }

            const baseUri = `${configs.IPFS_GATEWAY}/ipfs/${cid}`;
            const landOwnerAddress = new PublicKey(entry.owner.blockchainAddress);
            const landMerkleTree = new PublicKey(
                configs.LAND_MERKLE_TREE_ADDRESS as string
            );
            const blockhash = (await umi.rpc.getLatestBlockhash()).blockhash;

            const res = await MintTokenSendAndConfirm(
                entry.address,
                baseUri,
                landMerkleTree,
                landOwnerAddress,
                blockhash
            );

            if (res.status === 'failed') {
                retries.push({
                    ...entry,
                    signature: res.signature,
                    status: res.status,
                    createdAt: new Date().toISOString(),
                });
            } else {
                recheck.push({
                    ...entry,
                    signature: res.signature,
                    status: res.status,
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (err) {
            console.error(err);
            retries.push({
                ...entry,
                signature: null,
                status: 'failed',
                createdAt: new Date().toISOString(),
            });
        }
    };

    const recheckFunc = async () => {
        const pendingRecheck = [...recheck];
        recheck = [];

        for (const check of pendingRecheck) {
            if (!check.signature) {
                retries.push(check);
                continue;
            }

            try {
                const tx0 = await umi.rpc.getTransaction(decode(check.signature), {
                    commitment: 'confirmed',
                });

                const now = new Date();
                if (!tx0) {
                    if (now.getTime() - new Date(check.createdAt).getTime() > 7 * 60 * 1000) {
                        retries.push(check);
                    } else {
                        recheck.push(check);
                    }
                } else {
                    successCases.push({ ...check, status: 'success' });
                }
            } catch (err) {
                recheck.push(check);
            }
        }
    };

    // Initial minting loop
    for (const entry of addressesToMint) {
        await actuallyMint(entry);
    }

    await recheckFunc();

    // Retry loop until all retries and rechecks are resolved
    while (retries.length > 0 || recheck.length > 0) {
        const pendingRetries = [...retries];
        retries = [];

        for (const entry of pendingRetries) {
            await actuallyMint(entry);
        }

        await recheckFunc();
    }

    // Save final results to disk
    writeFileSync(
        join(__dirname, '../result/success-cases.json'),
        JSON.stringify(successCases, null, 2)
    );
    writeFileSync(
        join(__dirname, '../result/recheck-sigs.json'),
        JSON.stringify(recheck, null, 2)
    );
    writeFileSync(
        join(__dirname, '../result/retry.json'),
        JSON.stringify(retries, null, 2)
    );

    console.log('Minting process complete.');
}

main()
    .then(() => {
        console.log('Script passed');
    })
    .catch(err => {
        console.error('Error occurred:', err);
    });
