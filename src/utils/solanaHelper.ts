/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import axios from 'axios'
import 'dotenv/config'
import { readFileSync, writeFileSync } from 'fs'
import { findLeafAssetIdPda } from '@metaplex-foundation/mpl-bubblegum'
import {
    AccountInfo,
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    NonceAccount,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js'
import { AnchorProvider, Program, Wallet, web3 } from '@coral-xyz/anchor'
import { IDL, PropertyLayer } from '../types/PropertyLayer'
import { configs } from '../configs'
import {
    MPL_BUBBLEGUM_PROGRAM_ID,
    SPL_NOOP_PROGRAM_ID,
    SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    findTreeConfigPda,
    mplBubblegum,
    getMetadataArgsSerializer,
    TokenProgramVersion,
    TokenStandard,
} from '@metaplex-foundation/mpl-bubblegum'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import {
    TransactionWithMeta,
    Umi,
    createSignerFromKeypair,
    publicKey,
    signerIdentity,
} from '@metaplex-foundation/umi'
import { deserializeChangeLogEventV1 } from '@solana/spl-account-compression'
import { decode } from '@coral-xyz/anchor/dist/cjs/utils/bytes/bs58'
import * as anchor from '@coral-xyz/anchor'
import {
    findMetadataPda,
    findMasterEditionPda,
    MPL_TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import {
    ipfsVertexesAttributes,
    JSONMetadata,
    offChainMetadata,
} from "../types/ICustomRequest"
import { join } from 'path'
const prisma = new PrismaClient()
const centralizedAccKeypairPath = process.env.centralizedAccKeypairPath as string
const centralizedAccountSecretKey = Uint8Array.from(
    JSON.parse(readFileSync(centralizedAccKeypairPath, 'utf-8'))
)
const centralizedAccountKeypair = Keypair.fromSecretKey(
    centralizedAccountSecretKey
)

const NonceAccKeypairPath = process.env.NONCE_KEYPAIR_PATH as string
const NonceAccountSecretKey = Uint8Array.from(
    JSON.parse(readFileSync(NonceAccKeypairPath, 'utf-8'))
)
const NonceAccountKeypair = Keypair.fromSecretKey(NonceAccountSecretKey)
console.log(centralizedAccountKeypair.publicKey, NonceAccountKeypair.publicKey)

const wallet = new Wallet(centralizedAccountKeypair)

const connection = new Connection(process.env.RPC_URL as string);

const provider = new AnchorProvider(connection, wallet, {})

const umi = createUmi(provider.connection.rpcEndpoint).use(mplBubblegum())


umi.use(
    signerIdentity(
        createSignerFromKeypair(umi, {
            secretKey: centralizedAccountKeypair.secretKey,
            publicKey: publicKey(centralizedAccountKeypair.publicKey),
        })
    )
)

const programId = new PublicKey(configs.PROPERTY_LAYER_ID)
const program = new Program(
    IDL,
    programId,
    provider
) as unknown as Program<PropertyLayer>

export async function getMetaDataObject(address: string) {
    const property = await prisma.property.findFirst({
        where: {
            address,
            propertyStatusId: 0,
        },
    })
    console.log('Property metadata input:', property);

    if (!property) {
        throw Error('property already verified or doesnt exist')
    }

    const vertexes = await prisma.vertexes.findMany({
        where: { propertyId: property!.id },
    })

    let externalUrl = ''
    const ipfsVertexesAttributes: Array<ipfsVertexesAttributes> = []

    //adding vertexes to the metadata

    for (let i = 1; i <= vertexes.length; i++) {
        const { latitude, longitude } = vertexes[i - 1]

        ipfsVertexesAttributes.push({
            trait_type: `Vertex ${i}`,
            value: `${latitude}, ${longitude}`,
        })
        if (i === 1) {
            externalUrl = `https://www.latlong.net/c/?lat=${latitude}&long=${longitude}`
        }
    }

    const layerMetadata: JSONMetadata = {
        name: `${configs.LAND_TOKEN_NAME} ${property!.address}`,
        description: `An airspace layer of the ${property!.address} property.`,
        external_url: externalUrl,
        attributes: ipfsVertexesAttributes, // todo:  worry about the scenarios where we don't have vertexes? or the back office should take care of it?
    }

    const offChainMetadata: offChainMetadata = {
        name: `${property!.address}`,
        symbol: `${configs.LAND_TOKEN_SYMBOL}`,
        description: `An airspace layer of the ${property!.address} property.`,
        image: 'https://docs.sky.trade/logo-square.jpg',
        external_url: 'https://sky.trade',
        metadata: layerMetadata,
    }

    return offChainMetadata
}


export async function fetchNonce(
    nonceAccountAddress: PublicKey,
    previousBlockhash: string
) {
    console.log({ previousBlockhash });
    let nonceAccount: AccountInfo<Buffer> | null = null; // Explicitly type as AccountInfo<Buffer> or null
    let c = 0;
    let isLoop = true;

    while (isLoop) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        c++;

        if (c >= 150) {
            break;
        }

        nonceAccount = await connection.getAccountInfo(nonceAccountAddress);

        // Check if nonceAccount is null or undefined
        if (!nonceAccount) {
            console.log('Account info not found, retrying...');
            continue; // Retry if nonceAccount is not found
        }

        // Now safely access the `data` property
        const nonce = NonceAccount.fromAccountData(nonceAccount.data as Buffer);

        // Check if nonce is different from previousBlockhash
        if (nonce.nonce !== previousBlockhash) {
            isLoop = false;
            return { nonce, previousBlockhash };
        }

        console.log('Sleeping for 2 seconds...');
    }

    // In case the loop exits without finding a valid nonce
    return { nonce: null, previousBlockhash };
}

export async function doNonceAdvanceTX(previousBlockhash: string) {
    let isLoop = true
    do {
        try {
            const instruction = SystemProgram.nonceAdvance({
                authorizedPubkey: centralizedAccountKeypair.publicKey,
                noncePubkey: NonceAccountKeypair.publicKey,
            })

            const tx = new Transaction()
            tx.add(instruction)

            const ans = await sendAndConfirmTransaction(connection, tx, [
                centralizedAccountKeypair,
            ])
            console.log(ans)

            isLoop = false
            const ans2 = await fetchNonce(
                NonceAccountKeypair.publicKey,
                previousBlockhash
            )

            return { nonce: ans2?.nonce, previousBlockhash }
        } catch (error) {
            console.log('nonce error', error)
        }
    } while (isLoop)
}
export const convertToTx = async (
    instructions: TransactionInstruction[],
    previousBlockhash: string
) => {
    //let ans = await doNonceAdvanceTX(previousBlockhash)
    // let ans = await fetchNonce(NonceAccountKeypair.publicKey, previousBlockhash)

    // let nonce = ans?.nonce?.nonce
    // const blockhash = nonce as string
    // console.log('blockhash added', nonce)
    // let nonceAdvIx = SystemProgram.nonceAdvance({
    //     authorizedPubkey: centralizedAccountKeypair.publicKey,
    //     noncePubkey: NonceAccountKeypair.publicKey,
    // })

    const messageV0 = new anchor.web3.TransactionMessage({
        payerKey: centralizedAccountKeypair.publicKey,
        recentBlockhash: previousBlockhash,
        instructions: [...instructions],
    }).compileToV0Message()

    const transaction = new anchor.web3.VersionedTransaction(messageV0)

    return { transaction, previousBlockhash: previousBlockhash }
}


export const pinFilesToIPFS = async (metadata: any) => {
    const WEB_STORAGE_TOKEN = process.env.WEB_STORAGE_TOKEN

    if (!WEB_STORAGE_TOKEN) {
        console.error(
            'A token is needed. You can create one on https://www.pinata.cloud/'
        )
    }

    console.log(`Uploading  files to IPFS`)

    const data = JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
            name: 'metadata.json',
        },
    })

    const res = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        
        data,
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.WEB_STORAGE_TOKEN}`,
            },
        }
    )

    const cid = res.data['IpfsHash']
    console.log({ cid })
    return cid
}
export const getPriorityFeeIx = async () => {
    const fees = await connection.getRecentPrioritizationFees()
    const maxPrioritizationFee = fees.reduce((max, cur) => {
        return cur.prioritizationFee > max.prioritizationFee ? cur : max
    }, fees[0])

    const PRIORITY_FEE_IX = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: maxPrioritizationFee.prioritizationFee,
    })

    return PRIORITY_FEE_IX
}

export const truncateText = (text: string, maxLength: number): string => {
    if (text.length > maxLength) {
        return text.slice(0, maxLength)
    }
    return text
}
export async function MintTokenSendAndConfirm(
    address: string,
    baseUri: string,
    merkle_tree: PublicKey,
    recipient: PublicKey,
    previousBlockhash: string
) {
    const dataAccount = PublicKey.findProgramAddressSync(
        [Buffer.from('data_account')],
        program.programId
    )[0]

    const treeConfig = findTreeConfigPda(umi, {
        merkleTree: publicKey(merkle_tree),
    })[0]

    const collectionMint = new PublicKey(
        configs.COLLECTION_MINT_ADDRESS as string
        
    )
    console.log("Public key input:", collectionMint);


    const [collectionMetadata] = findMetadataPda(umi, {
        mint: publicKey(collectionMint),
    })

    const [collectionEdition] = findMasterEditionPda(umi, {
        mint: publicKey(collectionMint),
    })

    const [bubblegumSigner] = PublicKey.findProgramAddressSync(
        [Buffer.from('collection_cpi', 'utf8')],
        new PublicKey(MPL_BUBBLEGUM_PROGRAM_ID)
    )

    const metadataArgs = getMetadataArgsSerializer().serialize({
        name: `${truncateText(address, 30)}`,
        symbol: `${configs.LAND_TOKEN_SYMBOL}`,
        uri: baseUri,
        creators: [
            { address: umi.identity.publicKey, verified: true, share: 100 },
        ],
        sellerFeeBasisPoints: 0,
        primarySaleHappened: false,
        isMutable: true,
        editionNonce: null,
        uses: null,
        collection: {
            key: publicKey(collectionMint),
            verified: true,
        },
        tokenProgramVersion: TokenProgramVersion.Original,
        tokenStandard: TokenStandard.NonFungible,
    })

    const mintTokenAccountInputs = {
        dataAccount: dataAccount,
        merkleTree: merkle_tree,
        recipient: recipient,
        treeConfig: treeConfig,
        bubblegumProgram: MPL_BUBBLEGUM_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        feePayer: centralizedAccountKeypair.publicKey,
        systemProgram: web3.SystemProgram.programId,
        collectionMint,
        collectionMetadata,
        collectionEdition,
        bubblegumSigner,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
    }

    const mintTokenBuilder = program.methods
        .mintToken(Buffer.from(metadataArgs))
        .accounts(mintTokenAccountInputs)

    const ix = await mintTokenBuilder.instruction()
    //add memo to maintain uniqueness

    const priorityIx = await getPriorityFeeIx()

    const txWithPreviousBh = await convertToTx(
        [priorityIx, ix],
        previousBlockhash
    )

    txWithPreviousBh.transaction.sign([centralizedAccountKeypair])

    try {
        const sendRawTx = await provider.connection.sendTransaction(
            txWithPreviousBh.transaction
        )

        return {
            signature: sendRawTx,
            status: 'pending',
            // previousBlockhash: txWithPreviousBh.previousBlockhash,
        }
    } catch (error) {
        console.log(error)
        // throw Error('Failed to complete mint tx:')

        return {
            signature: null,
            status: 'failed',
        }
    }
}

export async function confirmTx(allSigs: any) {
    if (allSigs.length == 0) {
        return
    }

    for (let i = 0; i < allSigs.length; i++) {
        if (allSigs[i].confirmed == true || allSigs[i].signature == 'failed') {
            continue
        }
        const signature = allSigs[i].signature as string
        const tx0 = await connection.getTransaction(signature, {
            commitment: 'finalized',
            maxSupportedTransactionVersion: 0,
        })
        if (tx0) {
            allSigs[i].confirmed = true
        }
    }
    writeFileSync(
        join(__dirname, '../result/signatures.json'),
        JSON.stringify(allSigs)
    )
}

export const getTxMeta = async (signature: string) => {
    const tx0 = await umi.rpc.getTransaction(decode(signature), {
        commitment: 'confirmed',
    })
    return tx0
}
export const findLeafIndexFromUmiTx = (txInfo: TransactionWithMeta | null) => {
    let leafIndex: number | undefined = undefined

    if (!txInfo) {
        console.log('txInfo aka mintTxInfo undefined')
    }
    const innerInstructions = txInfo?.meta.innerInstructions || []
    console.log({ innerIxs: innerInstructions.length })
    for (let i = innerInstructions.length - 1; i >= 0; i--) {
        for (
            let j = innerInstructions[i].instructions.length - 1;
            j >= 0;
            j--
        ) {
            const instruction = innerInstructions[i].instructions[j]

            const programId = txInfo?.message.accounts[instruction.programIndex]

            if (programId?.toString() == SPL_NOOP_PROGRAM_ID.toString()) {
                try {
                    const changeLogEvent = deserializeChangeLogEventV1(
                        Buffer.from(instruction.data)
                    )

                    leafIndex = changeLogEvent?.index
                } catch (__) {
                    // do nothing, invalid data is handled just after the for loop
                }
            }
        }
    }

    const [assetId] = findLeafAssetIdPda(umi, {
        merkleTree: publicKey(process.env.LAND_MERKLE_TREE_ADDRESS as string),
        leafIndex: leafIndex as number,
    })
    console.log('assetId', assetId)
    console.log('Token(s) minted successfully!')

    return assetId
}

export { umi }
