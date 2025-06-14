/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csvParser from 'csv-parser';
import { runScript } from "../../src/utils/runScript";

export const config = {
  api: {
    bodyParser: false,
  },
};

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

function logErrorToFile(error: any) {
  const logFilePath = path.join(process.cwd(), 'errorLogs', 'log.txt');
  if (!fs.existsSync(path.dirname(logFilePath))) {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
  }
  const errorMessage = `[${new Date().toISOString()}] - Error: ${error}\n`;
  fs.appendFileSync(logFilePath, errorMessage);
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 3000 
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation(); 
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        console.log(`Retry attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay)); // Delay before retrying
      }
    }
  }
  throw lastError; 
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  await runMiddleware(req, res, upload.single('file'));

  const file = (req as any).file; 
  if (!file) {
    return res.status(400).json({ message: 'File not provided!' });
  }

  const uploadedFilePath = file.path;
  
  const records: { address: string; userEmail: string }[] = [];

  try {
    await retryOperation(() => new Promise<void>((resolve, reject) => {
      fs.createReadStream(uploadedFilePath)
        .pipe(csvParser())
        .on('data', (row) => {
          const address = row['Address'] || row['address'] || row['ADDRESS'];
          if (!address) {
            reject(new Error('Mandatory field "address" is missing in one or more rows.'));
          }
          const userEmail = row['userEmail'] || row['useremail'] || row['UserEmail'];
          if (!userEmail) {
            reject(new Error('Mandatory field "userEmail" is missing in one or more rows.'));
          }

          records.push({ address, userEmail });
        })
        .on('end', resolve)
        .on('error', reject);
    }), 3, 5000);

    if (records.length === 0) {
      return res.status(400).json({ message: 'No addresses found in the CSV file!' });
    }

    const destinationDirectory = path.join(process.cwd(), 'src/inputFiles');
    const destinationFilePath = path.join(destinationDirectory, 'allAddress.json');
    if (!fs.existsSync(destinationDirectory)) {
      fs.mkdirSync(destinationDirectory, { recursive: true });
    }
    fs.writeFileSync(destinationFilePath, JSON.stringify(records, null, 2));

    console.log('CSV records saved to:', destinationFilePath);

    console.log('Step 1: Running 1-getCoOrdinates.js...');
    await retryOperation(() => runScript('./src/scripts/1-getCoOrdinates.ts'), 3, 5000);
    console.log('Step 1 completed.');

    console.log('Step 2: Running 2-addPropertiesToDb.js...');
    await retryOperation(() => runScript('./src/scripts/2-addPropertiesToDb.ts'), 3, 5000);
    console.log('Step 2 completed.');

    console.log('Step 3: Running 3-mintTx.js...');
    await retryOperation(() => runScript('./src/scripts/3-mintTx.ts'), 3, 5000);
    console.log('Step 3 completed.');

    res.status(200).json({ message: 'CSV processed and scripts executed successfully!' });
  } catch (error) {
    console.error('Error processing CSV:', error);

    logErrorToFile(error);

    res.status(500).json({
      message: 'An error occurred during processing.',
      error,
      retryable: true, 
    });
  } finally {
    fs.unlinkSync(uploadedFilePath);
  }
}

