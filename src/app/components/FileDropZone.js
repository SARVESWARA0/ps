"use client";
import React, { useState, useCallback } from "react";
import { useFileProcessing } from "../backend/backend"; // Adjust the import path as necessary
import JSZip from "jszip"; // Import JSZip to handle ZIP files
import "../globals.css";

export let names = []; // Array to hold file names
export let contents = []; // Array to hold file contents

const FileDropZone = ({ onGlobalFileData }) => {
  const { isLoading } = useFileProcessing();
  const [isDragging, setIsDragging] = useState(false);
  const [globalFileData, setGlobalFileData] = useState([]); // State to hold filenames and contents

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);

      // Only process ZIP files
      const zipFile = files.find((file) => file.name.endsWith(".zip"));
      if (!zipFile) {
        alert("Please drop a ZIP file.");
        return;
      }

      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipFile); // Load the ZIP file
      const fileDataPromises = Object.keys(loadedZip.files).map(
        async (filename) => {
          const file = loadedZip.files[filename];

          // Exclude unwanted files
          if (filename.startsWith("__MACOSX") || filename.startsWith(".")) {
            return null; // Return null for files to be excluded
          }

          // Read the content of each file
          const content = await file.async("string"); // Adjust this if needed (e.g., "blob", "uint8array", etc.)
          return { name: filename, content }; // Create an object with the filename and content
        }
      );

      // Filter out null values (unwanted files)
      const allFileData = (await Promise.all(fileDataPromises)).filter(Boolean);

      // Clear the global arrays before pushing new data
      names = [];
      contents = [];

      // Push filenames and contents into respective arrays
      allFileData.forEach((fileData) => {
        names.push(fileData.name);
        contents.push(fileData.content);
      });

      setGlobalFileData(allFileData); // Update state with filenames and contents
      onGlobalFileData(allFileData); // Pass the combined data to the parent component
    },
    [onGlobalFileData]
  );
  return (
    <div className="dropzone-container mb-4">
      <div
        className={`dropzone ${isDragging ? "dragging" : ""} ${
          isLoading ? "loading" : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <p>{isDragging ? "Drop files here" : "Drag and drop ZIP files here"}</p>
        {isLoading && <span className="spinner">Processing files...</span>}
      </div>
      <div className="fileList mt-4">
        <h3 className="font-semibold">Files inside ZIP:</h3>
        {globalFileData.length > 0 ? (
          <ul>
            {globalFileData.map((file, index) => (
              <li key={index} className="file-item">
                {file.name}
              </li> // Display the file name
            ))}
          </ul>
        ) : (
          <p className="noFiles">No files uploaded.</p>
        )}
      </div>
    </div>
  );
};

export default FileDropZone;
