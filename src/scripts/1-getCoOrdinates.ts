import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import utf8 from 'utf8'
import { encode } from 'urlencode'
import axios from 'axios'

interface AddressData {
    address: string;
    longitude: string | number;
    latitude: string | number;
}

async function main() {
    const allAddress: Array<string> = JSON.parse(
        readFileSync(
            join(__dirname, '../inputFiles/allAddress.json'),
            'utf-8'
        )
    )

    const addressesToAddToDb: AddressData[] = []

    for (let i = 0; i < allAddress.length; i++) {
        const address = allAddress[i]
        const utf8Address = utf8.encode(address)
        const urlAddress = encode(utf8Address)
        console.log('--------------sending request ', i)

        try {
            const res = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${urlAddress}.json?proximity=ip&access_token=pk.eyJ1IjoiaGlsYXJ5MDE3IiwiYSI6ImNsb2JsMmY2eDB0ZHkyaW5uY3Z5bHd2N3UifQ.hYtTUYI0t96rw74IgqhcSg`
            )

            const ans = res.data
            const geoLo = ans?.features[0]?.geometry?.coordinates

            const result: AddressData = {
                address: address,
                longitude: geoLo ? geoLo[0] : 'ZeroAddress',  
                latitude: geoLo ? geoLo[1] : 'ZeroAddress', 
            }
            addressesToAddToDb.push(result)
        } catch (error) {
            console.log(error)
            const result: AddressData = {
                address: address,
                longitude: 'ZeroAddress',
                latitude: 'ZeroAddress',
            }
            addressesToAddToDb.push(result)
        }

        await new Promise((_) => setTimeout(_, 1000))
    }

    console.log('Total addresses processed:', addressesToAddToDb.length)

    writeFileSync(
        join(__dirname, '../result/propertiesToAddToDb.json'),
        JSON.stringify(addressesToAddToDb)
    )
}

main()
    .then(() => {
        console.log('Script completed successfully.')
    })
    .catch((err) => {
        console.log('Error occurred:', err)
    })
