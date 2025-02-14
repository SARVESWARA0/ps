"use client";
import React, { useState, useCallback } from "react";
import { useFileProcessing } from "./unzip";
import JSZip from "jszip";
import "../globals.css";

const MAX_FILE_SIZE_MB = 50;

const FileDropZone = ({ onGlobalFileData }) => {
  const { isLoading } = useFileProcessing();
  const [isDragging, setIsDragging] = useState(false);
  const [globalFileData, setGlobalFileData] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

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
      setErrorMessage("");

      const files = Array.from(e.dataTransfer.files);
      const zipFile = files.find((file) => file.name.endsWith(".zip"));
      if (!zipFile) {
        setErrorMessage("Please drop a ZIP file.");
        return;
      }

      // Check file size limit
      const fileSizeMB = zipFile.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        setErrorMessage(`File size exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
        return;
      }

      try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(zipFile);
        const fileDataPromises = Object.keys(loadedZip.files).map(
          async (filename) => {
            const file = loadedZip.files[filename];

            // Exclude directories, system files, and package files
            if (
              file.dir ||
              filename.startsWith("__MACOSX") ||
              filename.startsWith(".") ||
              filename === "package.json" ||
              filename === "package-lock.json"
            ) {
              return null;
            }

            const content = await file.async("string");
            return { name: filename, content };
          }
        );

        const allFileData = (await Promise.all(fileDataPromises)).filter(
          Boolean
        );
        setGlobalFileData(allFileData);
        onGlobalFileData(allFileData);
      } catch (error) {
        setErrorMessage("An error occurred while processing the ZIP file.");
     
      }
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

      {/* Error Message Display */}
      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="fileList mt-4" id="filenames">
        <h3 className="font-semibold">Files inside ZIP:</h3>

        {globalFileData.length > 0 ? (
          <ul>
            {globalFileData.map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-name">{file.name}</span>
              </div>
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
