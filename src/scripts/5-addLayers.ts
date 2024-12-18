import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { findLeafIndexFromUmiTx, getTxMeta } from '../solanaHelper'
import { TransactionMeta } from '@metaplex-foundation/umi'
import { PrismaClient } from '@prisma/client'

/* todo:
add the properties
add the vertexes
add the WeekDayRanges */

const prisma = new PrismaClient()
async function main() {
    let allSigs = JSON.parse(
        readFileSync(join(__dirname, '../../result/signatures.json'), 'utf-8')
    )
    let assetIdWithPRoperty: any = []
    let prismaTxs = []
    for (let i = 0; i < allSigs.length; i++) {
        if (allSigs[i].confirmed) {
            let mintTxInfo = await getTxMeta(allSigs[i].signature)
            console.log('mintTxInfo', mintTxInfo?.message.version)
            const assetId = findLeafIndexFromUmiTx(mintTxInfo)
            assetIdWithPRoperty.push({ assetId, propertyId: allSigs[i].id })
            prismaTxs.push(
                prisma.layer.create({
                    data: { tokenId: assetId, propertyId: allSigs[i].id },
                })
            )
        }
    }
    prisma.$transaction(prismaTxs)
    writeFileSync(
        join(__dirname, '../../result/layerProperties.json'),
        JSON.stringify(assetIdWithPRoperty)
    )
}
main()
    .then(() => {
        console.log('script passed')
    })
    .catch((err) => {
        console.log('error occured', err)
    })
