/* eslint-disable @typescript-eslint/no-unsafe-function-type */
// // import { NextApiRequest, NextApiResponse } from 'next';
// // import multer from 'multer';
// // import path from 'path';
// // import fs from 'fs';
// // import csvParser from 'csv-parser';
// // import { runScript } from '../../src/utils/runScript';

// // const upload = multer({ dest: 'src/uploads/' });

// // // Middleware to handle file upload
// // const multerMiddleware = (req: any, res: any, next: any) => {
// //   upload.single('file')(req, res, (err) => {
// //     if (err instanceof multer.MulterError) {
// //       return res.status(400).json({ error: err.message });
// //     } else if (err) {
// //       return res.status(500).json({ error: 'File upload failed.' });
// //     }
// //     next();
// //   });
// // };

// // // Helper function for logging errors
// // const logErrorToFile = (errorMessage: string): void => {
// //   const logFilePath = path.join(process.cwd(), 'src/logs/errors.log');
// //   const timestamp = new Date().toISOString();
// //   const logMessage = `[${timestamp}] ERROR: ${errorMessage}\n`;
// //   fs.appendFileSync(logFilePath, logMessage, 'utf8');
// // };

// // // Function to execute a script
// // const executeScript = async (
// //   scriptPath: string,
// //   stepDescription: string,
// //   continueAfterError: boolean,
// //   onErrorCallback: (step: string, errorMessage: string) => Promise<boolean>
// // ) => {
// //   try {
// //     console.log(`${stepDescription} started...`);
// //     await runScript(scriptPath);
// //     console.log(`${stepDescription} completed successfully.`);
// //   } catch (error: any) {
// //     console.error(`${stepDescription} failed: ${error.message}`);
// //     logErrorToFile(`Error in ${stepDescription}: ${error.message}`);
// //     const shouldContinue = continueAfterError || (await onErrorCallback(stepDescription, error.message));
// //     if (!shouldContinue) {
// //       throw new Error(`Execution halted during ${stepDescription}.`);
// //     }
// //   }
// // };

// // export const config = {
// //   api: {
// //     bodyParser: false, // Disable Next.js default bodyParser for file upload
// //   },
// // };

// // export default async function handler(req: NextApiRequest & { file?: Express.Multer.File }, res: NextApiResponse) {
// //   if (req.method !== 'POST') {
// //     res.status(405).json({ message: 'Method Not Allowed' });
// //     return;
// //   }

// //   await new Promise<void>((resolve, reject) => multerMiddleware(req, res, (err: any) => (err ? reject(err) : resolve())));

// //   if (!req.file) {
// //     res.status(400).json({ message: 'File not provided!' });
// //     return;
// //   }

// //   const uploadedFilePath = req.file.path;
// //   const continueAfterError = req.body.continueAfterError || false;
// //   const addresses: string[] = [];

// //   try {
// //     // Parse CSV
// //     await new Promise<void>((resolve, reject) => {
// //       fs.createReadStream(uploadedFilePath)
// //         .pipe(csvParser())
// //         .on('data', (row: Record<string, string>) => {
// //           const address = row['Address'] || row['address'] || row['ADDRESS'];
// //           if (address) addresses.push(address);
// //         })
// //         .on('end', () => (addresses.length ? resolve() : reject(new Error('No addresses found in CSV file!'))))
// //         .on('error', (err: Error) => reject(err));
// //     });

// //     // Save addresses to JSON
// //     const destinationDirectory = path.join(process.cwd(), 'src/inputFiles');
// //     const destinationFilePath = path.join(destinationDirectory, 'allAddress.json');
// //     if (!fs.existsSync(destinationDirectory)) fs.mkdirSync(destinationDirectory, { recursive: true });
// //     fs.writeFileSync(destinationFilePath, JSON.stringify(addresses, null, 2));

// //     // Error callback function
// //     const onErrorCallback = async (step: string, errorMessage: string) => {
// //       console.error(`Error during ${step}: ${errorMessage}`);
// //       console.log(`Continuing despite error in ${step}.`);
// //       return continueAfterError;
// //     };

// //     // Execute scripts
// //     await executeScript('src/scripts/1-getCoOrdinates.ts', 'Step 1: Get Coordinates', continueAfterError, onErrorCallback);
// //     await executeScript('src/scripts/2-addPropertiesToDb.ts', 'Step 2: Add Properties to Database', continueAfterError, onErrorCallback);
// //     await executeScript('src/scripts/3-mintTx.ts', 'Step 3: Mint Transactions', continueAfterError, onErrorCallback);

// //     res.status(200).json({ message: 'Scripts executed successfully!' });
// //   } catch (error: any) {
// //     console.error('Error during script execution:', error.message);
// //     res.status(500).json({ message: 'An error occurred during execution.', error: error.message });
// //   } finally {
// //     // Clean up uploaded file
// //     if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
// //   }
// // }



// import { NextApiRequest, NextApiResponse } from "next";
// import fs from "fs";
// import path from "path";
// import formidable from "formidable";
// import csvParser from "csv-parser";
// import { runScript } from "../../src/utils/runScript";

// export const config = {
//   api: {
//     bodyParser: false, // Disable built-in body parsing for file uploads
//   },
// };

// const uploadHandler = async (req: NextApiRequest, res: NextApiResponse) => {
//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed" });
//   }

//   const form = formidable({
//     uploadDir: path.join(process.cwd(), "public/uploads"),
//     keepExtensions: true,
//   });

//   const addresses: string[] = [];

//   try {
//     // Step 1: Handle file upload and get the file path
//     const filePath = await new Promise<string>((resolve, reject) => {
//       form.parse(req, (err, fields, files) => {
//         if (err) {
//           console.error("File upload error:", err);
//           return reject(err);
//         }
//         const file = (files.file as unknown as formidable.File) || {};
//         resolve(file.filepath || "");
//       });
//     });

//     // Step 2: Parse CSV file and extract addresses
//     await new Promise<void>((resolve, reject) => {
//       fs.createReadStream(filePath)
//         .pipe(csvParser())
//         .on("data", (row: Record<string, string>) => {
//           const address = row["Address"] || row["address"] || row["ADDRESS"];
//           if (address) addresses.push(address);
//         })
//         .on("end", resolve)
//         .on("error", reject);
//     });

//     if (addresses.length === 0) {
//       return res.status(400).json({ message: "No valid addresses found in the CSV file!" });
//     }

//     // Step 3: Save addresses to a JSON file
//     const outputDir = path.join(process.cwd(), "src", "inputFiles");
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//     }
//     const outputPath = path.join(outputDir, "allAddress.json");
//     fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));

//     // Step 4: Execute scripts in sequence
//     await runScript(path.join(process.cwd(), "src/scripts/1-getCoOrdinates.ts"));
//     await runScript(path.join(process.cwd(), "src/scripts/2-addPropertiesToDb.ts"));
//     await runScript(path.join(process.cwd(), "src/scripts/3-mintTx.ts"));

//     res.status(200).json({ message: "Scripts executed successfully!" });
//   } catch (error: any) {
//     console.error("Error during upload and processing:", error.message);
//     res.status(500).json({ message: "Internal server error", error: error.message });
//   }
// };

// export default uploadHandler;


// import { NextApiRequest, NextApiResponse } from "next";
// import formidable, { File } from "formidable";
// import fs from "fs";
// import path from "path";

// export const config = {
//   api: {
//     bodyParser: false, // Disable bodyParser to handle file uploads
//   },
// };

// // Ensure upload directory exists
// const ensureUploadDirectoryExists = () => {
//   const uploadDir = path.join(process.cwd(), "public/uploads");
//   if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
//   }
//   return uploadDir;
// };

// // API Route Handler
// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ message: "Method not allowed. Use POST instead." });
//   }

//   try {
//     // Ensure upload directory exists
//     const uploadDir = ensureUploadDirectoryExists();

//     // Initialize Formidable
//     const form = formidable({
//       uploadDir,
//       keepExtensions: true,
//     });

//     // Parse the form
//     const { fields, files }: { fields: formidable.Fields; files: formidable.Files } = await new Promise(
//       (resolve, reject) => {
//         form.parse(req, (err, fields, files) => {
//           if (err) {
//             console.error("Error parsing form:", err);
//             return reject(err);
//           }
//           resolve({ fields, files });
//         });
//       }
//     );

//     // Validate uploaded file
//     const uploadedFile = files.file as File | File[]; // `files.file` could be a single file or an array

//     // Handle single or multiple file uploads
//     const fileArray = Array.isArray(uploadedFile) ? uploadedFile : [uploadedFile];

//     for (const file of fileArray) {
//       if (!file.filepath || !fs.existsSync(file.filepath)) {
//         throw new Error(`File path is invalid or undefined: ${file.filepath}`);
//       }

//       console.log("Uploaded file details:", file);
//     }

//     // Respond with success
//     res.status(200).json({
//       message: "File uploaded successfully!",
//       files: fileArray.map((file) => ({
//         filepath: file.filepath,
//         originalFilename: file.originalFilename,
//       })),
//     });
//   } catch (error: any) {
//     console.error("Error handling file upload:", error.message);
//     res.status(500).json({ message: error.message });
//   }
// }



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
