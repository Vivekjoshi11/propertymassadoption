// import dotenv from 'dotenv';
// dotenv.config({ path: './.env.local' });

// import fs from 'fs';
// import { join } from 'path';
// import { Keypair, PublicKey } from '@solana/web3.js';
// import { configs } from '../configs';
// import {
//     getMetaDataObject,
//     MintTokenSendAndConfirm,
//     pinFilesToIPFS,
// } from '../utils/solanaHelper';

// // Load environment variable for keypair path
// const keypairPath = process.env.centralizedAccKeypairPath;
// if (!keypairPath) {
//     throw new Error('centralizedAccKeypairPath is not defined in the environment variables.');
// }

// console.log('centralizedAccKeypairPath:', keypairPath);

// // Read and parse the keypair file
// const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
// const uint8Keypair = new Uint8Array(keypairData);
// const keypair = Keypair.fromSecretKey(uint8Keypair);

// console.log('Public Key:', keypair.publicKey.toString());
// console.log('Private Key:', keypair.secretKey);

// if (!configs.LAND_MERKLE_TREE_ADDRESS) {
//     throw new Error('LAND_MERKLE_TREE_ADDRESS is not defined in the configuration.');
// }

// const landMerkleTree = new PublicKey(configs.LAND_MERKLE_TREE_ADDRESS);

// async function main(): Promise<void> {
//     try {
//         // Load properties to mint from JSON file
//         const addressesToMint = JSON.parse(
//             fs.readFileSync(
//                 join(__dirname, '../result/dbPropertiesTomint.json'),
//                 'utf-8'
//             )
//         );

//         for (const address of addressesToMint) {
//             try {
//                 console.log('propertyId=', address.id);

//                 const pinataMetadata = await getMetaDataObject(address.id);
//                 const cid = await pinFilesToIPFS(pinataMetadata);
//                 const baseUri = cid ? `${configs.IPFS_GATEWAY}/ipfs/${cid}` : '';

//                 const landOwnerAddress = address.blockchainAddress;
//                 const txSig = await MintTokenSendAndConfirm(
//                     address.address,
//                     baseUri,
//                     landMerkleTree,
//                     landOwnerAddress
//                 );

//                 const signaturesPath = join(__dirname, '../result/signatures.json');
//                 const allSigs = JSON.parse(fs.readFileSync(signaturesPath, 'utf-8'));
//                 const sigObj = { ...address, signature: txSig, confirmed: false };

//                 allSigs.push(sigObj);
//                 fs.writeFileSync(signaturesPath, JSON.stringify(allSigs, null, 2));
//             } catch (error) {
//                 console.error(`Error processing address ${address.id}:`, error);
//             }
//         }
//     } catch (error) {}
// }

// main()
//     .then(() => {
//         console.log('Script completed successfully.');
//     })
//     .catch((err) => {
//         console.error('Error occurred:', err);
//     });
import { PublicKey } from '@solana/web3.js'
import { configs } from '../configs'
import {
    getMetaDataObject,
    MintTokenSendAndConfirm,
    pinFilesToIPFS,
} from '../utils/solanaHelper'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
//todo :: add check for unique address to mint from sig file
import { decode } from '@coral-xyz/anchor/dist/cjs/utils/bytes/bs58'
import { umi } from '../utils/solanaHelper'

type addressesToMint = {
    id: number
    address: string
    owner: {
        blockchainAddress: string
    }
    longitude: number
    latitude: number
}
type signatures = {
    id: number
    address: string
    owner: {
        blockchainAddress: string
    }
    longitude: number
    latitude: number
    signature: string
    confirmed: boolean
    layerAdded: boolean
}

async function checkUniqueAddress(
    addressesToMint: Array<addressesToMint>,
    allSigs: Array<signatures>
) {
    console.log('here', addressesToMint.length, allSigs.length)
    const ans: addressesToMint[] = []
    for (let i = 0; i < addressesToMint.length; i++) {
        const addToMint = addressesToMint[i].id
        let flag = false
        let isThere = false
        for (let j = 0; j < allSigs.length; j++) {
            if (addToMint == allSigs[j].id) {
                isThere = true
                if (
                    allSigs[j].signature == 'failed' ||
                    allSigs[j].confirmed == false
                ) {
                    flag = true
                }
            }
        }
        if (isThere == false || flag == true) {
            ans.push(addressesToMint[i])
        }
    }

    return ans
}

async function main() {
    const addressesToMint: addressesToMint[] = JSON.parse(
        readFileSync(
            join(__dirname, '../result/dbPropertiesTomint.json'),
            'utf-8'
        )
    )

    const passedCases = JSON.parse(
        readFileSync(join(__dirname, '../result/success-cases.json'), {
            encoding: 'utf8',
            flag: 'r',
        })
    )

    const logSuccess = (data: any) => {
        writeFileSync(
            join(__dirname, '../result/success-cases.json'),
            JSON.stringify(data)
        )

        console.log('saved to disk')
    }

    let recheck = JSON.parse(
        readFileSync(join(__dirname, '../result/recheck-sigs.json'), {
            encoding: 'utf8',
            flag: 'r',
        })
    )

    const logRecheck = (data: any) => {
        writeFileSync(
            join(__dirname, '../result/recheck-sigs.json'),
            JSON.stringify(data)
        )
    }

    let retries = JSON.parse(
        readFileSync(join(__dirname, '../result/retry.json'), {
            encoding: 'utf8',
            flag: 'r',
        })
    )

    const logRetries = (data: any) => {
        console.log(data)

        writeFileSync(
            join(__dirname, '../result/retry.json'),
            JSON.stringify(data)
        )
    }

    const recheckFunc = async () => {
        for (const check of recheck) {
            // await new Promise((resolve) => {
            //     setTimeout(resolve, 2000)
            // })

            recheck = recheck.filter((el: any) => el != check)

            console.log(check)

            if (check.signature == undefined) {
                retries.push(check)
                continue
            }

            try {
                const tx0 = await umi.rpc.getTransaction(
                    decode(check.signature),
                    {
                        commitment: 'confirmed',
                    }
                )
                const now = new Date()
                if (tx0 == null) {
                    if (
                        now.getTime() - new Date(check.createdAt).getTime() >
                        7 * 60 * 1000
                    ) {
                        retries.push(check)
                    } else {
                        recheck.push(check)
                    }
                } else {
                    passedCases.push({ ...check, status: 'success' })
                }

                logRecheck(recheck)
                logRetries(retries)
                logSuccess(passedCases)
            } catch (err) {
                recheck.push(check)
            }
        }
    }

    const actuallyMint = async (entry: any) => {
        try {
            // mint token
            const pinataMetadata = await getMetaDataObject(entry.address)
            const cid = await pinFilesToIPFS(pinataMetadata)

            if (cid == '') {
                retries.push({
                    ...entry,
                    signature: null,
                    status: 'failed',
                    createdAt: new Date().toISOString(),
                })

                return
            }

            const baseUri = `${configs.IPFS_GATEWAY}/ipfs/${cid}`

            const landOwnerAddress = new PublicKey(entry.owner.blockchainAddress)

            const landMerkleTree = new PublicKey(
                configs.LAND_MERKLE_TREE_ADDRESS as string
            )

            const blockhash = (await umi.rpc.getLatestBlockhash()).blockhash

            const res = await MintTokenSendAndConfirm(
                entry.address,
                baseUri,
                landMerkleTree,
                landOwnerAddress,
                blockhash
            )

            if (res.status == 'failed') {
                retries.push({
                    ...entry,
                    signature: res.signature,
                    status: res.status,
                    createdAt: new Date().toISOString(),
                })
            } else {
                recheck.push({
                    ...entry,
                    signature: res.signature,
                    status: res.status,
                    createdAt: new Date().toISOString(),
                })
            }
        } catch (err) {
            console.log(err)
            retries.push({
                ...entry,
                signature: null,
                status: 'failed',
                createdAt: new Date().toISOString(),
            })
        }
    }

    // we've done 1 -> 50

    for (let i = 0; i < addressesToMint.length; i++) {
        const entry = addressesToMint[i]

        await actuallyMint(entry)
    }

    logRecheck(recheck)
    logRetries(retries)
    logSuccess(passedCases)

    await recheckFunc()

    while (retries.length > 0 || recheck.length > 0) {
        for (let i = 0; i < retries.length; i++) {
            const entry = retries[i]

            retries = retries.filter((el: any) => el != entry)

            await actuallyMint(entry)

            logRecheck(recheck)
            logRetries(retries)
            logSuccess(passedCases)
        }

        await recheckFunc()

        logRecheck(recheck)
        logRetries(retries)
        logSuccess(passedCases)
    }


}

main()
    .then(() => {
        console.log('script passed')
    })
    .catch((err) => {
        console.log('error occured', err)
    })