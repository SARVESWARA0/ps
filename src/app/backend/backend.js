import { useState, useEffect } from "react";
import JSZip from "jszip";
import moment from "moment";


export const useFileProcessing = () => {
  const [files, setFiles] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [globalFileData, setGlobalFileData] = useState([]); // Global variable to store file contents

  // Process files whenever a new file is added
  useEffect(() => {
    if (files.length > 0) {
      const f = files[0];
      const dateBefore = new Date();

      // Using JSZip to load the file
      JSZip.loadAsync(f)
        .then((zip) => {
          const contents = [];
          const readFilesPromises = [];

          zip.forEach((relativePath, zipEntry) => {
            const filePromise = zipEntry.async("string").then((data) => {
              contents.push({ name: zipEntry.name, data });
            });
            readFilesPromises.push(filePromise);
          });

          Promise.all(readFilesPromises)
            .then(() => {
              const loadTime = moment(new Date()).diff(moment(dateBefore));
              setFileInfo({
                loadTime,
                contents: contents.sort((a, b) => a.name.localeCompare(b.name)),
                error: null,
              });
              setGlobalFileData(contents); // Store contents globally
            })
            .catch((e) => {
              const loadTime = moment(new Date()).diff(moment(dateBefore));
              setFileInfo({
                loadTime,
                contents: [],
                error: "Error reading zip contents: " + e.message,
              });
              setGlobalFileData([]); // Reset global data in case of error
            });
        })
        .catch((e) => {
          const loadTime = moment(new Date()).diff(moment(dateBefore));
          setFileInfo({
            loadTime,
            contents: [],
            error: "Error reading " + f.name + ": " + e.message,
          });
          setGlobalFileData([]); // Reset global data in case of error
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

  return { fileInfo, handleDrop, globalFileData }; // Return the global file data
};
