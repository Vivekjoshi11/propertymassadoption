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

// console.log("SOLANA_PUBLIC_KEY from environment:", process.env.SOLANA_PUBLIC_KEY);

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






// previous code 


// import { PublicKey } from '@solana/web3.js'
// import { configs } from '../configs'
// import {
//     getMetaDataObject,
//     MintTokenSendAndConfirm,
//     pinFilesToIPFS,
// } from '../utils/solanaHelper'
// import { join } from 'path'
// import { readFileSync, writeFileSync } from 'fs'
// //todo :: add check for unique address to mint from sig file
// import { decode } from '@coral-xyz/anchor/dist/cjs/utils/bytes/bs58'
// import { umi } from '../utils/solanaHelper'

// type addressesToMint = {
//     id: number
//     address: string
//     owner: {
//         blockchainAddress: string
//     }
//     longitude: number
//     latitude: number
// }
// type signatures = {
//     id: number
//     address: string
//     owner: {
//         blockchainAddress: string
//     }
//     longitude: number
//     latitude: number
//     signature: string
//     confirmed: boolean
//     layerAdded: boolean
// }

// async function checkUniqueAddress(
//     addressesToMint: Array<addressesToMint>,
//     allSigs: Array<signatures>
// ) {
//     console.log('here', addressesToMint.length, allSigs.length)
//     const ans: addressesToMint[] = []
//     for (let i = 0; i < addressesToMint.length; i++) {
//         const addToMint = addressesToMint[i].id
//         let flag = false
//         let isThere = false
//         for (let j = 0; j < allSigs.length; j++) {
//             if (addToMint == allSigs[j].id) {
//                 isThere = true
//                 if (
//                     allSigs[j].signature == 'failed' ||
//                     allSigs[j].confirmed == false
//                 ) {
//                     flag = true
//                 }
//             }
//         }
//         if (isThere == false || flag == true) {
//             ans.push(addressesToMint[i])
//         }
//     }

//     return ans
// }

// async function main() {
//     const addressesToMint: addressesToMint[] = JSON.parse(
//         readFileSync(
//             join(__dirname, '../../result/dbPropertiesTomint.json'),
//             'utf-8'
//         )
//     )

//     const passedCases = JSON.parse(
//         readFileSync(join(__dirname, './../../result/success-cases.json'), {
//             encoding: 'utf8',
//             flag: 'r',
//         })
//     )

//     const logSuccess = (data: any) => {
//         writeFileSync(
//             join(__dirname, '../result/success-cases.json'),
//             JSON.stringify(data)
//         )

//         console.log('saved to disk')
//     }

//     let recheck = JSON.parse(
//         readFileSync(join(__dirname, '../result/recheck-sigs.json'), {
//             encoding: 'utf8',
//             flag: 'r',
//         })
//     )

//     const logRecheck = (data: any) => {
//         writeFileSync(
//             join(__dirname, '../result/recheck-sigs.json'),
//             JSON.stringify(data)
//         )
//     }

//     let retries = JSON.parse(
//         readFileSync(join(__dirname, '../result/retry.json'), {
//             encoding: 'utf8',
//             flag: 'r',
//         })
//     )

//     const logRetries = (data: any) => {
//         console.log(data)

//         writeFileSync(
//             join(__dirname, '../result/retry.json'),
//             JSON.stringify(data)
//         )
//     }

//     const recheckFunc = async () => {
//         for (const check of recheck) {
//             // await new Promise((resolve) => {
//             //     setTimeout(resolve, 2000)
//             // })

//             recheck = recheck.filter((el: any) => el != check)

//             console.log(check)

//             if (check.signature == undefined) {
//                 retries.push(check)
//                 continue
//             }

//             try {
//                 const tx0 = await umi.rpc.getTransaction(
//                     decode(check.signature),
//                     {
//                         commitment: 'confirmed',
//                     }
//                 )
//                 const now = new Date()
//                 if (tx0 == null) {
//                     if (
//                         now.getTime() - new Date(check.createdAt).getTime() >
//                         7 * 60 * 1000
//                     ) {
//                         retries.push(check)
//                     } else {
//                         recheck.push(check)
//                     }
//                 } else {
//                     passedCases.push({ ...check, status: 'success' })
//                 }

//                 logRecheck(recheck)
//                 logRetries(retries)
//                 logSuccess(passedCases)
//             } catch (err) {
//                 recheck.push(check)
//             }
//         }
//     }

//     const actuallyMint = async (entry: any) => {
//         try {
//             // mint token
//             const pinataMetadata = await getMetaDataObject(entry.address)
//             const cid = await pinFilesToIPFS(pinataMetadata)

//             if (cid == '') {
//                 retries.push({
//                     ...entry,
//                     signature: null,
//                     status: 'failed',
//                     createdAt: new Date().toISOString(),
//                 })

//                 return
//             }

//             const baseUri = `${configs.IPFS_GATEWAY}/ipfs/${cid}`

//             const landOwnerAddress = new PublicKey(entry.owner.blockchainAddress)

//             const landMerkleTree = new PublicKey(
//                 configs.LAND_MERKLE_TREE_ADDRESS as string
//             )

//             const blockhash = (await umi.rpc.getLatestBlockhash()).blockhash

//             const res = await MintTokenSendAndConfirm(
//                 entry.address,
//                 baseUri,
//                 landMerkleTree,
//                 landOwnerAddress,
//                 blockhash
//             )

//             if (res.status == 'failed') {
//                 retries.push({
//                     ...entry,
//                     signature: res.signature,
//                     status: res.status,
//                     createdAt: new Date().toISOString(),
//                 })
//             } else {
//                 recheck.push({
//                     ...entry,
//                     signature: res.signature,
//                     status: res.status,
//                     createdAt: new Date().toISOString(),
//                 })
//             }
//         } catch (err) {
//             console.log(err)
//             retries.push({
//                 ...entry,
//                 signature: null,
//                 status: 'failed',
//                 createdAt: new Date().toISOString(),
//             })
//         }
//     }

//     // we've done 1 -> 50

//     for (let i = 0; i < addressesToMint.length; i++) {
//         const entry = addressesToMint[i]

//         await actuallyMint(entry)
//     }

//     logRecheck(recheck)
//     logRetries(retries)
//     logSuccess(passedCases)

//     await recheckFunc()

//     while (retries.length > 0 || recheck.length > 0) {
//         for (let i = 0; i < retries.length; i++) {
//             const entry = retries[i]

//             retries = retries.filter((el: any) => el != entry)

//             await actuallyMint(entry)

//             logRecheck(recheck)
//             logRetries(retries)
//             logSuccess(passedCases)
//         }

//         await recheckFunc()

//         logRecheck(recheck)
//         logRetries(retries)
//         logSuccess(passedCases)
//     }

   
// }

// main()
//     .then(() => {
//         console.log('script passed')
//     })
//     .catch((err) => {
//         console.log('error occured', err)
//     })
