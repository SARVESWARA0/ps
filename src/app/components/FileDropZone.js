"use client";
import React, { useState, useCallback } from "react";
import { useFileProcessing } from "./unzip";
import JSZip from "jszip";
import "../globals.css";

const FileDropZone = ({ onGlobalFileData }) => {
  const { isLoading } = useFileProcessing();
  const [isDragging, setIsDragging] = useState(false);
  const [globalFileData, setGlobalFileData] = useState([]);

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
      const zipFile = files.find((file) => file.name.endsWith(".zip"));
      if (!zipFile) {
        alert("Please drop a ZIP file.");
        return;
      }

      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipFile);
      const fileDataPromises = Object.keys(loadedZip.files).map(
        async (filename) => {
          const file = loadedZip.files[filename];

          // Check if the entry is a directory or a system file
          if (
            file.dir ||
            filename.startsWith("__MACOSX") ||
            filename.startsWith(".")
          ) {
            return null;
          }

          const content = await file.async("string");
          return { name: filename, content };
        }
      );

      const allFileData = (await Promise.all(fileDataPromises)).filter(Boolean);

      setGlobalFileData(allFileData);
      onGlobalFileData(allFileData);
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
