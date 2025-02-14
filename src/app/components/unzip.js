import { useState } from "react";
import JSZip from "jszip";

export const useFileProcessing = () => {
  const [globalFileData, setGlobalFileData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const processFiles = async (event) => {
    const files = Array.from(event.dataTransfer.files);
    const zipFiles = files.filter((file) => file.type === "application/zip");

    if (zipFiles.length > 0) {
      setIsLoading(true);
      const allFileNames = [];

      // Process each zip file
      for (const zipFile of zipFiles) {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);

        // Filter out unwanted files and folders
        const fileNames = Object.keys(content.files).filter((fileName) => {
          // Exclude system files and directories
          return (
            !fileName.startsWith("__MACOSX") && !content.files[fileName].dir
          );
        });

        allFileNames.push(...fileNames); // Collect valid file names
      }

      setGlobalFileData(allFileNames); // Store processed file names
      setIsLoading(false);
    }
  };

  return { globalFileData, processFiles, isLoading };
};

export default useFileProcessing;
