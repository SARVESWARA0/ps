'use client'
import React from 'react';
import { useFileProcessing } from './api/chat/route.js';

const FileDropZone = () => {
  const { fileInfo, handleDrop } = useFileProcessing(); // Get logic from route.js

  return (
    <div>
      {/* Drag-and-Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()} // Allow file dropping
        style={{
          border: '2px dashed #ccc',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <p>Drag & Drop your ZIP file here</p>
      </div>

      {/* Display File Info */}
      {fileInfo && (
        <div>
          <p>Load time: {fileInfo.loadTime} ms</p>
          <p>Contents:</p>
          <ul>
            {fileInfo.contents.map((content, index) => (
              <li key={index}>{content}</li>
            ))}
          </ul>
          {fileInfo.error && <p>Error: {fileInfo.error}</p>}
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
