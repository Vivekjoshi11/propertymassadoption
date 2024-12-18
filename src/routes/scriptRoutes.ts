

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parser';
import { runScript } from '@/utils/runScript'; // Adjust path as needed
import { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';

// Configure Multer
const upload = multer({ dest: 'src/uploads/' });

// Create a custom type for NextApiRequest to include 'file'
interface CustomNextApiRequest extends NextApiRequest {
  file?: Express.Multer.File;
}

const handler = nextConnect<CustomNextApiRequest, NextApiResponse>();

// Use multer middleware
handler.use(upload.single('file'));

handler.post(async (req:CustomNextApiRequest, res: NextApiResponse) => {
  if (!req.file) {
    res.status(400).json({ message: 'File not provided!' });
    return;
  }

  const uploadedFilePath = req.file.path;
  const addresses: string[] = [];

  try {
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
        .on('end', () => {
          if (addresses.length === 0) {
            return reject(new Error('No addresses found in the CSV file!'));
          }
          resolve();
        })
        .on('error', (err) => reject(err));
    });

    const destinationDirectory = path.join(process.cwd(), './src/inputFiles');
    const destinationFilePath = path.join(destinationDirectory, 'allAddress.json');

    if (!fs.existsSync(destinationDirectory)) {
      fs.mkdirSync(destinationDirectory, { recursive: true });
    }

    fs.writeFileSync(destinationFilePath, JSON.stringify(addresses, null, 2));
    console.log('CSV addresses saved to:', destinationFilePath);

    console.log('Step 1: Running 1-getCoOrdinates.js...');
    await runScript('./src/scripts/1-getCoOrdinates.ts');
    console.log('Step 1 completed successfully.');

    console.log('Step 2: Running 2-addPropertiesToDb.js...');
    await runScript('./src/scripts/2-addPropertiesToDb.ts');
    console.log('Step 2 completed successfully.');

    console.log('Step 3: Running 3-mintTx.js...');
    await runScript('./src/scripts/3-mintTx.ts');
    console.log('Step 3 completed successfully.');

    res.status(200).json({ message: 'Scripts executed successfully!' });
  } catch (error) {
    console.error('An error occurred during script execution:', error);
    res.status(500).json({ message: 'An error occurred during execution.', error });
  }
});

export default handler;
