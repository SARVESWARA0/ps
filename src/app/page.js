"use client";
import React, { useState } from "react";
import FileDropZone from "./components/FileDropZone"; // Adjust import path as necessary
import PostContents from "./components/PostContent"; // Adjust import path as necessary
import "./globals.css";

const Page = () => {
  const [fileNames, setFileNames] = useState([]);
  const [fileContents, setFileContents] = useState([]);
  const [loading, setLoading] = useState(false); // Loading state for file submission
  const [error, setError] = useState(null); // Error state

  const handleGlobalFileData = (fileData) => {
    // Extract names and contents and set the state
    const names = fileData.map((file) => file.name);
    const contents = fileData.map((file) => file.content);

    setFileNames(names);
    setFileContents(contents);
  };

  return (
    <div>
      <h1 className="audiowide">CodEva🛠️</h1>
      <FileDropZone
        className="file-drop-zone"
        onGlobalFileData={handleGlobalFileData}
      />
      <PostContents
        className="file-list"
        fileNames={fileNames}
        fileContents={fileContents}
        loading={loading}
        setLoading={setLoading}
        setError={setError}
      />
      {error && <p className="text-red-500">{error}</p>}{" "}
      {/* Display error message */}
    </div>
  );
};

export default Page;
