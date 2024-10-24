
import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import moment from 'moment';

// Logic to handle file drop and zip processing
export const useFileProcessing = () => {
  const [files, setFiles] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);

  // Process files whenever a new file is added
  useEffect(() => {
    if (files.length > 0) {
      const f = files[0];
      const dateBefore = new Date();
      
      // Using JSZip to load the file
      JSZip.loadAsync(f)
        .then((zip) => {
          const contents = [];
          zip.forEach((relativePath, zipEntry) => {
            contents.push(zipEntry.name);
          });
          const loadTime = moment(new Date()).diff(moment(dateBefore));
          setFileInfo({
            loadTime,
            contents: contents.sort(),
            error: null,
          });
        })
        .catch((e) => {
          const loadTime = moment(new Date()).diff(moment(dateBefore));
          setFileInfo({
            loadTime,
            contents: [],
            error: "Error reading " + f.name + ": " + e.message,
          });
        });
    }
  }, [files]);

  // Handle drop event logic
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      setFiles(Array.from(droppedFiles)); // Convert FileList to array
    }
  };

  return { fileInfo, handleDrop };
};
