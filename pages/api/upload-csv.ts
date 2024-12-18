/* eslint-disable @typescript-eslint/no-unsafe-function-type */



import { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parser';
import { runScript } from "../../src/utils/runScript";
export const config = {
  api: {
    bodyParser: false, // Disable bodyParser for file uploads
  },
};

// Multer setup
const upload = multer({ dest: 'public/uploads/' });

function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await runMiddleware(req, res, upload.single('file'));

  const file = (req as any).file; // Multer adds `file` to req
  if (!file) {
    return res.status(400).json({ message: 'File not provided!' });
  }

  const uploadedFilePath = file.path;
  const addresses: string[] = [];

  try {
    // Step 1: Read CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(uploadedFilePath)
        .pipe(csvParser())
        .on('data', (row) => {
          console.log('Parsed row:', row);
          const address = row['Address'] || row['address'] || row['ADDRESS'];
          if (address) {
            addresses.push(address);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (addresses.length === 0) {
      return res.status(400).json({ message: 'No addresses found in the CSV file!' });
    }

    // Step 2: Save addresses to JSON
    const destinationDirectory = path.join(process.cwd(), 'inputFiles');
    const destinationFilePath = path.join(destinationDirectory, 'allAddress.json');
    if (!fs.existsSync(destinationDirectory)) {
      fs.mkdirSync(destinationDirectory, { recursive: true });
    }
    fs.writeFileSync(destinationFilePath, JSON.stringify(addresses, null, 2));

    console.log('CSV addresses saved to:', destinationFilePath);

    // Step 3: Execute scripts
    console.log('Step 1: Running 1-getCoOrdinates.js...');
    await runScript('./src/scripts/1-getCoOrdinates.ts');
    console.log('Step 1 completed.');

    console.log('Step 2: Running 2-addPropertiesToDb.js...');
    await runScript('./src/scripts/2-addPropertiesToDb.ts');
    console.log('Step 2 completed.');

    console.log('Step 3: Running 3-mintTx.js...');
    await runScript('./src/scripts/3-mintTx.ts');
    console.log('Step 3 completed.');

    res.status(200).json({ message: 'CSV processed and scripts executed successfully!' });
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ message: 'An error occurred during processing.', error });
  } finally {
    // Optional: Clean up uploaded file
    fs.unlinkSync(uploadedFilePath);
  }
}
