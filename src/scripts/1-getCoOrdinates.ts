import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import utf8 from 'utf8'
import { encode } from 'urlencode'
import axios from 'axios'

// Define the structure of the address data
interface AddressData {
    address: string;
    longitude: string | number;
    latitude: string | number;
}

async function main() {
    // Read all addresses from the input JSON file
    const allAddress: Array<string> = JSON.parse(
        readFileSync(
            join(__dirname, '../inputFiles/allAddress.json'),
            'utf-8'
        )
    )

    // Initialize an array to hold the addresses with their respective longitude and latitude
    const addressesToAddToDb: AddressData[] = []

    // Loop through all addresses
    for (let i = 0; i < allAddress.length; i++) {
        const address = allAddress[i]
        const utf8Address = utf8.encode(address)
        const urlAddress = encode(utf8Address)
        console.log('--------------sending request ', i)

        try {
            // Make a request to the geocoding API to get the longitude and latitude
            const res = await axios.get(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${urlAddress}.json?proximity=ip&access_token=pk.eyJ1IjoiaGlsYXJ5MDE3IiwiYSI6ImNsb2JsMmY2eDB0ZHkyaW5uY3Z5bHd2N3UifQ.hYtTUYI0t96rw74IgqhcSg`
            )

            // Get the geo coordinates from the API response
            const ans = res.data
            const geoLo = ans?.features[0]?.geometry?.coordinates

            // Create the result object with address, longitude, and latitude
            const result: AddressData = {
                address: address,
                longitude: geoLo ? geoLo[0] : 'ZeroAddress',  // Check if geoLo is defined
                latitude: geoLo ? geoLo[1] : 'ZeroAddress',  // Check if geoLo is defined
            }
            addressesToAddToDb.push(result)
        } catch (error) {
            console.log(error)
            // If there's an error, push the result with 'ZeroAddress' as coordinates
            const result: AddressData = {
                address: address,
                longitude: 'ZeroAddress',
                latitude: 'ZeroAddress',
            }
            addressesToAddToDb.push(result)
        }

        // Halt for 1 second before making the next request to avoid rate-limiting
        await new Promise((_) => setTimeout(_, 1000))
    }

    // Log the total number of addresses processed
    console.log('Total addresses processed:', addressesToAddToDb.length)

    // Write the result to a new JSON file
    writeFileSync(
        join(__dirname, '../result/propertiesToAddToDb.json'),
        JSON.stringify(addressesToAddToDb)
    )
}

// Execute the main function and handle any errors
main()
    .then(() => {
        console.log('Script completed successfully.')
    })
    .catch((err) => {
        console.log('Error occurred:', err)
    })
