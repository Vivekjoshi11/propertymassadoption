import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import utf8 from 'utf8'
import { encode } from 'urlencode'
import axios from 'axios'
let accessToken =
    'pk.eyJ1IjoiaGlsYXJ5MDE3IiwiYSI6ImNsb2JsMmY2eDB0ZHkyaW5uY3Z5bHd2N3UifQ.hYtTUYI0t96rw74IgqhcSg'
async function main() {
    let allAddress: Array<any> = JSON.parse(
        readFileSync(
            join(__dirname, '../../input/skytradeProdproperties.json'),
            'utf-8'
        )
    )

    type csvTableFormat = {
        propertyId: number
        address: string
        country: string
        state?: string | undefined
    }

    let csvTypes: Array<csvTableFormat> = []

    let countryToAddress: Map<
        string,
        [{ propertyId: string; address: string }]
    > = new Map()
    let stateToAddress: Map<string, Set<string>> = new Map()
    //let addressesToAddToDb = []
    let c1 = 0,
        c2 = 0,
        c3 = 0
    for (let i = 0; i < allAddress.length; i++) {
        try {
            let {
                ID,
                Address,
                Latitude: latitude,
                Longitude: longitude,
            } = allAddress[i]
            if (latitude == 0 || longitude == 0) {
                c3++
                continue
            }
            let reverseUrl = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${accessToken}`
            console.log('--------------sending request ', i)
            let axios_res = await axios.get(reverseUrl)
            const res = axios_res.data

            let country = res?.features[0]?.properties.context.country.name
            let region = res?.features[0]?.properties.context.region.name
            let inputVAl: csvTableFormat = {
                propertyId: ID,
                country,
                state: region,
                address: Address,
            }
            csvTypes.push(inputVAl)

            await new Promise((_) => setTimeout(_, 100))
        } catch (error) {
            console.log('error', error)
        }
    }
    console.log({ c1, c2, c3 })
    console.log('total address', allAddress.length)
    //console.log(countryToAddress)
    const obj1 = Object.fromEntries(stateToAddress)
    // writeFileSync(
    //     join(__dirname, '../../result/segregatedStates.json'),
    //     JSON.stringify(obj1)
    // )
    const obj2 = Object.fromEntries(countryToAddress)
    writeFileSync(
        join(__dirname, '../../result/segregatedCountry.json'),
        JSON.stringify(csvTypes)
    )
}

function _isString(s1: string) {
    const a1 = parseInt(s1)
    if (Number.isNaN(a1)) {
        return true
    }
    return false
}
main()
    .then(() => {
        console.log('script passed')
    })
    .catch((err) => {
        console.log('error occured', err)
    })
