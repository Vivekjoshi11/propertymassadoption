import { PrismaClient } from '@prisma/client'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import 'dotenv/config'

const prisma = new PrismaClient()

async function addProperties() {
    const prismaTx: Array<any> = []
    const addressesToStoreInDb: Array<{
        address: string
        longitude: number
        latitude: number
    }> = JSON.parse(
        readFileSync(
            join(__dirname, '../result/propertiesToAddToDb.json'),
            'utf-8'
        )
    )

    for (let i = 0; i < addressesToStoreInDb.length; i++) {
        const { address, latitude, longitude } = addressesToStoreInDb[i]

        // Fetch owner details based on ownerId (from environment variable)
        const owner = await prisma.user.findUnique({
            where: { id: parseInt(process.env.OWNERID as string) },
            select: { blockchainAddress: true }
        })

        if (!owner) {
            console.log('Owner not found');
            continue;
        }

        const data = prisma.property.create({
            select: {
                id: true,
                address: true,
                owner: { select: { blockchainAddress: true } },
                longitude: true,
                latitude: true,
            },
            data: {
                title: address,
                transitFee: '0',
                address,
                timezone: 'US/Central',
                hasLandingDeck: false,
                hasChargingStation: false,
                hasStorageHub: false,
                isFixedTransitFee: true,
                isRentableAirspace: true,
                weekDayRanges: {
                    create: [
                        {
                            weekDayId: 0,
                            fromTime: 0,
                            toTime: 24,
                            isAvailable: true,
                        },
                        {
                            weekDayId: 1,
                            fromTime: 0,
                            toTime: 24,
                            isAvailable: true,
                        },
                        {
                            weekDayId: 2,
                            fromTime: 0,
                            toTime: 24,
                            isAvailable: true,
                        },
                        {
                            weekDayId: 3,
                            fromTime: 0,
                            toTime: 24,
                            isAvailable: true,
                        },
                        {
                            weekDayId: 4,
                            fromTime: 0,
                            toTime: 24,
                            isAvailable: true,
                        },
                        {
                            weekDayId: 5,
                            fromTime: 0,
                            toTime: 24,
                            isAvailable: true,
                        },
                        {
                            weekDayId: 6,
                            fromTime: 0,
                            toTime: 24,
                            isAvailable: true,
                        },
                    ],
                },
                ownerId: parseInt(process.env.OWNERID as string),
                latitude,
                longitude,
                vertexes: { create: [{ latitude, longitude }] },
            },
        })
        prismaTx.push(data)
    }

    try {
        const ans = await prisma.$transaction(prismaTx)

        // Now structure the output in the required format:
        const formattedResult = ans.map((property: any) => ({
            id: property.id,
            address: property.address,
            owner: {
                blockchainAddress: property.owner.blockchainAddress,
            },
            longitude: property.longitude,
            latitude: property.latitude,
        }))
        console.log(formattedResult)

        // Write the result to a file in the desired format
        writeFileSync(
            join(__dirname, '../result/dbPropertiesTomint.json'),
            JSON.stringify(formattedResult, null, 2) // pretty print with 2 spaces indentation
        )
        console.log('Properties added and saved successfully');
    } catch (error) {
        console.log('Prisma transaction failed', error)
        throw new Error('Prisma transaction failed')
    }
}

async function main() {
    await addProperties()
}

main()
    .then(() => {
        console.log('script passed')
    })
    .catch((err) => {
        console.log('error occurred', err)
    })
