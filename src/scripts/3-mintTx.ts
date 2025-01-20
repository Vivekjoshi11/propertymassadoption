/* eslint-disable @typescript-eslint/no-unused-vars */
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
import {
    AddressesToMint,
    Signatures,
    RetryEntry,
    RecheckEntry,
    FailedTx, // New type
} from '../utils/types';

async function main() {
    const addressesToMint: AddressesToMint[] = JSON.parse(
        readFileSync(join(__dirname, '../result/dbPropertiesTomint.json'), 'utf-8')
    );

    const successCases: RetryEntry[] = [];
    let recheck: RecheckEntry[] = [];
    let retries: RetryEntry[] = [];
    const failedTx: FailedTx[] = []; // Array to store permanently failed transactions

    const retryCountMap: Map<string, number> = new Map(); // Track retry counts by address

    const actuallyMint = async (entry: AddressesToMint) => {
        try {
            const pinataMetadata = await getMetaDataObject(entry.address);
            const cid = await pinFilesToIPFS(pinataMetadata);

            if (!cid) {
                handleFailedRetry(entry, null);
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
                handleFailedRetry(entry, res.signature);
            } else {
                recheck.push({
                    ...entry,
                    signature: res.signature,
                    status: 'success',
                    createdAt: new Date().toISOString(),
                });
            }
        } catch (err) {
            console.error(err);
            handleFailedRetry(entry, null);
        }
    };

    const handleFailedRetry = (entry: AddressesToMint, signature: string | null) => {
        const retryCount = retryCountMap.get(entry.address) || 0;

        if (retryCount >= 3) {
            // Convert entry.id to a string before adding to failedTx
            failedTx.push({
                ...entry,
                signature,
                createdAt: new Date().toISOString(),
                id: String(entry.id), // Convert id to string here
            });
        } else {
            retries.push({
                ...entry,
                signature,
                status: 'failed',
                createdAt: new Date().toISOString(),
            });
            retryCountMap.set(entry.address, retryCount + 1);
        }
    };

    const recheckFunc = async () => {
        const pendingRecheck = [...recheck];
        recheck = [];

        for (const check of pendingRecheck) {
            if (!check.signature) {
                handleFailedRetry(check, null);
                continue;
            }

            try {
                const tx0 = await umi.rpc.getTransaction(decode(check.signature), {
                    commitment: 'confirmed',
                });

                const now = new Date();
                if (!tx0) {
                    if (now.getTime() - new Date(check.createdAt).getTime() > 7 * 60 * 1000) {
                        handleFailedRetry(check, check.signature);
                    } else {
                        recheck.push(check);
                    }
                } else {
                    successCases.push({ ...check, status: 'success' });
                }
            } catch (err) {
                recheck.push(check);
                console.log(err)
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
    writeFileSync(
        join(__dirname, '../result/failed-txs.json'),
        JSON.stringify(failedTx, null, 2)
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
