'use client'
import React from 'react';
import { useFileProcessing } from './backend/backend.js';

const FileDropZone = () => {
  const { fileInfo, handleDrop, globalFileData } = useFileProcessing(); // Access global file data

  // Function to use globalFileData globally
  const handleGlobalData = () => {
    console.log("Global file data:", globalFileData);
    // You can use globalFileData here for any global operations
  };

  return (
    <div>
      {/* Drag-and-Drop Zone */}
      <div
        className='dropbox'
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()} // Allow file dropping
      >
        <p>Drag and drop files here</p>
      </div>

      {/* Display File Info */}
      {fileInfo && (
        <div>
          <p>Load time: {fileInfo.loadTime} ms</p>
          <button onClick={handleGlobalData}>Use Global Data</button>
          {fileInfo.error && <p>Error: {fileInfo.error}</p>}
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
