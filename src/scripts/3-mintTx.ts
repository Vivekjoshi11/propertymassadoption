import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

import fs from 'fs';
import { join } from 'path';
import { Keypair, PublicKey } from '@solana/web3.js';
import { configs } from '../configs';
import {
    getMetaDataObject,
    MintTokenSendAndConfirm,
    pinFilesToIPFS,
} from '../utils/solanaHelper';

// Load environment variable for keypair path
const keypairPath = process.env.centralizedAccKeypairPath;
if (!keypairPath) {
    throw new Error('centralizedAccKeypairPath is not defined in the environment variables.');
}

console.log('centralizedAccKeypairPath:', keypairPath);

// Read and parse the keypair file
const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
const uint8Keypair = new Uint8Array(keypairData);
const keypair = Keypair.fromSecretKey(uint8Keypair);

console.log('Public Key:', keypair.publicKey.toString());
console.log('Private Key:', keypair.secretKey);

if (!configs.LAND_MERKLE_TREE_ADDRESS) {
    throw new Error('LAND_MERKLE_TREE_ADDRESS is not defined in the configuration.');
}

const landMerkleTree = new PublicKey(configs.LAND_MERKLE_TREE_ADDRESS);

async function main(): Promise<void> {
    try {
        // Load properties to mint from JSON file
        const addressesToMint = JSON.parse(
            fs.readFileSync(
                join(__dirname, '../result/dbPropertiesTomint.json'),
                'utf-8'
            )
        );

        for (const address of addressesToMint) {
            try {
                console.log('propertyId=', address.id);

                const pinataMetadata = await getMetaDataObject(address.id);
                const cid = await pinFilesToIPFS(pinataMetadata);
                const baseUri = cid ? `${configs.IPFS_GATEWAY}/ipfs/${cid}` : '';

                const landOwnerAddress = address.blockchainAddress;
                const txSig = await MintTokenSendAndConfirm(
                    address.address,
                    baseUri,
                    landMerkleTree,
                    landOwnerAddress
                );

                const signaturesPath = join(__dirname, '../result/signatures.json');
                const allSigs = JSON.parse(fs.readFileSync(signaturesPath, 'utf-8'));
                const sigObj = { ...address, signature: txSig, confirmed: false };

                allSigs.push(sigObj);
                fs.writeFileSync(signaturesPath, JSON.stringify(allSigs, null, 2));
            } catch (error) {
                console.error(`Error processing address ${address.id}:`, error);
            }
        }
    } catch (error) {}
}

main()
    .then(() => {
        console.log('Script completed successfully.');
    })
    .catch((err) => {
        console.error('Error occurred:', err);
    });
