import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

interface Address {
    address: string;
    latitude: number;
    longitude: number;
}

async function addProperties(): Promise<void> {
    const prismaTx: ReturnType<typeof prisma.property.create>[] = [];

    const addressesToStoreInDb: Address[] = JSON.parse(
        readFileSync(join(__dirname, "../result/properties.ToAddToDb.json"), "utf-8")
    );

    for (const { address, latitude, longitude } of addressesToStoreInDb) {
        const existingProperty = await prisma.property.findFirst({
            where: { address },
        });

        if (existingProperty) {
            console.log(`Property at ${address} already exists.`);
            continue; // Skip this property if it exists
        }

        const data = prisma.property.create({
            data: {
                title: address,
                transitFee: "0",
                address,
                timezone: "US/Central",
                hasLandingDeck: false,
                hasChargingStation: false,
                hasStorageHub: false,
                isFixedTransitFee: true,
                isRentableAirspace: true,
                weekDayRanges: {
                    create: [
                        { weekDayId: 0, fromTime: 0, toTime: 24, isAvailable: true },
                        { weekDayId: 1, fromTime: 0, toTime: 24, isAvailable: true },
                        { weekDayId: 2, fromTime: 0, toTime: 24, isAvailable: true },
                        { weekDayId: 3, fromTime: 0, toTime: 24, isAvailable: true },
                        { weekDayId: 4, fromTime: 0, toTime: 24, isAvailable: true },
                        { weekDayId: 5, fromTime: 0, toTime: 24, isAvailable: true },
                        { weekDayId: 6, fromTime: 0, toTime: 24, isAvailable: true },
                    ],
                },
                latitude,
                longitude,
                vertexes: { create: [{ latitude, longitude }] },
                owner: {
                    connect: {
                        blockchainAddress: "BXe1hSS7Sbgy2t2PaVxevwnmQZhA5axJaYykVHcsCShZ" 
                       
                    },
                },
            },
        });
        prismaTx.push(data);
    }

    try {
        const ans = await prisma.$transaction(prismaTx);
        console.log("Properties added successfully:", ans);
    } catch (err) {
        console.error("Error occurred during transaction:", err);
    }
}

async function main(): Promise<void> {
    await addProperties();
}

main()
    .then(() => {
        console.log("Script passed");
    })
    .catch((err) => {
        console.error("Error occurred", err);
    });

