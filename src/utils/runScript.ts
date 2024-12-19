
// import { exec } from "child_process";

// export const runScript = (scriptPath: string): Promise<string> => {
//   return new Promise((resolve, reject) => {
//     const process = exec(`ts-node ${scriptPath}`, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error executing script ${scriptPath}:`, error);
//         reject(error);
//       } else {
//         console.log(`Output for ${scriptPath}:`, stdout);
//         resolve(stdout);
//       }
//     });

//     process.stdout?.on("data", (data) => console.log(data));
//     process.stderr?.on("data", (data) => console.error(data));
//   });
// };



import { exec } from "child_process";

export const runScript = (scriptPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const process = exec(`ts-node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script ${scriptPath}:`, error);
        reject(error);
      } else {
        console.log(`Output for ${scriptPath}:`, stdout);
        resolve(stdout);
      }
    });

    process.stdout?.on("data", (data) => console.log(data));
    process.stderr?.on("data", (data) => console.error(data));
  });
};

// src/utils/runScript.ts

// import { exec } from "child_process";
// import { writeFileSync, existsSync, readFileSync } from 'fs';
// import path from 'path';

// // Function to update the progress
// function updateProgress(lastExecutedScript: string, completed: boolean) {
//   const progress = { lastExecutedScript, completed };
//   const progressFilePath = path.join(process.cwd(), 'progress.json');
//   writeFileSync(progressFilePath, JSON.stringify(progress, null, 2));
// }

// // Function to get the current progress
// function getProgress() {
//   const progressFilePath = path.join(process.cwd(), 'progress.json');
//   if (existsSync(progressFilePath)) {
//     const progressData = readFileSync(progressFilePath, 'utf-8');
//     return JSON.parse(progressData);
//   }
//   return { lastExecutedScript: '', completed: false };
// }

// // Your existing runScript function
// export const runScript = (scriptPath: string): Promise<string> => {
//   return new Promise((resolve, reject) => {
//     const process = exec(`ts-node ${scriptPath}`, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error executing script ${scriptPath}:`, error);
//         reject(error);
//       } else {
//         console.log(`Output for ${scriptPath}:`, stdout);
//         resolve(stdout);
//       }
//     });

//     process.stdout?.on("data", (data) => console.log(data));
//     process.stderr?.on("data", (data) => console.error(data));
//   });
// };

// // Function to run scripts with progress tracking
// export const runScriptsWithProgress = async () => {
//   const progress = getProgress();

//   try {
//     // Step 1: Run script 1 if not already done
//     if (progress.lastExecutedScript !== '1-getCoOrdinates' || !progress.completed) {
//       console.log('Running 1-getCoOrdinates...');
//       await runScript('./src/scripts/1-getCoOrdinates.ts');
//       updateProgress('1-getCoOrdinates', true);
//     }

//     // Step 2: Run script 2 if not already done
//     if (progress.lastExecutedScript !== '2-addPropertiesToDb' || !progress.completed) {
//       console.log('Running 2-addPropertiesToDb...');
//       await runScript('./src/scripts/2-addPropertiesToDb.ts');
//       updateProgress('2-addPropertiesToDb', true);
//     }

//     // Step 3: Run script 3 if not already done
//     if (progress.lastExecutedScript !== '3-mintTx' || !progress.completed) {
//       console.log('Running 3-mintTx...');
//       await runScript('./src/scripts/3-mintTx.ts');
//       updateProgress('3-mintTx', true);
//     }

//     console.log('All scripts executed successfully!');
//   } catch (error) {
//     console.error('Error during script execution:', error);
//     updateProgress(progress.lastExecutedScript, false); // Mark as incomplete
//   }
// };
