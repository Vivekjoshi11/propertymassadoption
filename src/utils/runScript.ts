
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
