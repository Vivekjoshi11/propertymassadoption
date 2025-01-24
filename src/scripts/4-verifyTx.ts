// import { readFileSync } from 'fs'
// import { join } from 'path'
// import { confirmTx } from '../solanaHelper'

// async function main() {
//     let unverifiedSigs: any = []
//     do {
//         let allSigs = JSON.parse(
//             readFileSync(
//                 join(__dirname, '../../result/signatures.json'),
//                 'utf-8'
//             )
//         )
//         allSigs.forEach((element: any) => {
//             if (element.confirmed == false) {
//                 unverifiedSigs.push(element)
//             }
//         })
//         console.log('sigs to confirm', unverifiedSigs.length)
//         await confirmTx(unverifiedSigs)
//     } while (unverifiedSigs.length != 0)
// }

// main()
//     .then(() => {
//         console.log('script passed')
//     })
//     .catch((err) => {
//         console.log('error occured', err)
//     })
