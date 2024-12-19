"use client";

import { useState } from "react";
import axios from "axios";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const MAX_RETRIES = 3;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setStatus(`Selected file: ${event.target.files[0].name}`);
    }
  };

  const retryWithConfirmation = async () => {
    const userConfirmed = window.confirm(
      "An error occurred. Do you want to retry?"
    );
    if (userConfirmed) {
      await handleUpload();
    } else {
      setStatus("Process stopped by user.");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus("Please select a CSV file before uploading.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsLoading(true);
    setStatus("Uploading CSV file and starting scripts...");

    try {
      const response = await axios.post(
        "/api/upload-csv",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (
        response.data &&
        response.data.message ===
          "CSV processed and scripts executed successfully!"
      ) {
        setStatus("File has been successfully uploaded and scripts executed.");
        setRetryCount(0); // Reset retry count on success
      } else {
        setStatus("Error occurred during script execution.");
        if (retryCount < MAX_RETRIES) {
          setRetryCount((prev) => prev + 1);
          await retryWithConfirmation();
        }
      }
    } catch (error) {
      console.error("API Error:", error);
      setStatus("Network error occurred. Please check the API server.");
      if (retryCount < MAX_RETRIES) {
        setRetryCount((prev) => prev + 1);
        await retryWithConfirmation();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Please Upload CSV File
        </h1>
        <p className="text-gray-600 mb-6">
          Upload your CSV file to execute the scripts automatically.
        </p>

        <div className="mb-4 flex items-center w-full border border-gray-300 rounded-md p-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="text-sm text-gray-500 truncate max-w-xs">
            {file ? file.name : "No file chosen"}
          </span>
          <button
            className="ml-auto py-1 px-4 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            onClick={() =>
              document.querySelector('input[type="file"]')?.click()
            }
          >
            Choose File
          </button>
        </div>

        <button
          onClick={handleUpload}
          disabled={isLoading}
          className={`w-full py-3 px-4 text-white font-bold rounded-md transition ${
            isLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isLoading ? "Uploading..." : "Upload & Execute"}
        </button>

        {status && (
          <p className="mt-4 text-sm font-medium text-gray-700">{status}</p>
        )}
      </div>
    </div>
  );
}
