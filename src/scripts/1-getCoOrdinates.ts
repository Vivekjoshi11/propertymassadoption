// import { readFileSync, writeFileSync } from 'fs'
// import { join } from 'path'
// import utf8 from 'utf8'
// import { encode } from 'urlencode'
// import axios from 'axios'

// async function main() {
//     const allAddress: Array<string> = JSON.parse(
//         readFileSync(
//             join(__dirname, '../../inputFiles/allAddress.json'),
//             'utf-8'
//         )
//     )
//     const addressesToAddToDb = []
//     for (let i = 0; i < allAddress.length; i++) {
//         const address = allAddress[i]
//         const utf8Address = utf8.encode(address)
//         const urlAddress = encode(utf8Address)
//         console.log('--------------sending request ', i)
//         try {
//             const res = await axios.get(
//                 `https://api.mapbox.com/geocoding/v5/mapbox.places/${urlAddress}.json?proximity=ip&access_token=pk.eyJ1IjoiaGlsYXJ5MDE3IiwiYSI6ImNsb2JsMmY2eDB0ZHkyaW5uY3Z5bHd2N3UifQ.hYtTUYI0t96rw74IgqhcSg`
//             )
//             const ans = res.data
//             const geoLo = ans?.features[0]?.geometry?.coordinates
//             const result = {
//                 address: address,
//                 longitude: geoLo[0],
//                 latitude: geoLo[1],
//             }
//             addressesToAddToDb.push(result)
//         } catch (error) {
//             console.log(error)
//             const result = {
//                 address: address,
//                 longitude: 'ZeroAddress',
//                 latitude: 'ZeroAddress',
//             }
//             addressesToAddToDb.push(result)
//         }
//         //halt for 2sec
//         await new Promise((_) => setTimeout(_, 2000))
//     }
//     console.log('total address', addressesToAddToDb.length)
//     writeFileSync(
//         join(__dirname, '../result/properties.ToAddToDb.json'),
//         JSON.stringify(addressesToAddToDb)
//     )
// }
// main()
//     .then(() => {
//         console.log('script passed')
//     })
//     .catch((err) => {
//         console.log('error occured', err)
//     })


import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import utf8 from 'utf8'
import { encode } from 'urlencode'
import axios from 'axios'

async function main() {
    const allAddress: Array<string> = JSON.parse(
        readFileSync(
            join(__dirname, '../inputFiles/allAddress.json'),
            'utf-8'
        )
    )
    const addressesToAddToDb = []
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
            const result = {
                address: address,
                longitude: geoLo[0],
                latitude: geoLo[1],
            }
            addressesToAddToDb.push(result)
        } catch (error) {
            console.log(error)
            const result = {
                address: address,
                longitude: 'ZeroAddress',
                latitude: 'ZeroAddress',
            }
            addressesToAddToDb.push(result)
        }
        //halt for 2sec
        await new Promise((_) => setTimeout(_, 2000))
    }
    console.log('total address', addressesToAddToDb.length)
    writeFileSync(
        join(__dirname, '../result/propertiesToAddToDb.json'),
        JSON.stringify(addressesToAddToDb)
    )
}
main()
    .then(() => {
        console.log('script passed')
    })
    .catch((err) => {
        console.log('error occured', err)
    })