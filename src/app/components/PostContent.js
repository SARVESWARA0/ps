"use client";

import React from "react";
import { experimental_useObject as useObject } from "ai/react";

const PostContents = ({ fileNames, fileContents, loading, setLoading, setError }) => {
  const { messages, object, submit } = useObject({
    api: "../api/chat", 
  });

  const handleSubmit = async (e) => {
    e.preventDefault(); 

    if (fileContents.length === 0) {
      console.error("No files to send");
      return; // Exit early if no files are present
    }

    setLoading(true); // Set loading to true
    setError(null); // Reset error state

    try {
      const fileData = fileNames.map((name, index) => ({
        name,
        content: fileContents[index],
      }));
      const response = await submit({ files: fileData });
      console.log("Response from API:", response); // Log the full response

      if (response) {
        console.log("Response received:", response);
      } else {
        throw new Error(object?.error || "Error submitting files.");
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error.message); // Set error message
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="post-contents">
      <h2 className="text-lg font-bold mt-4">Uploaded Files</h2>
      <form className="mt-2" onSubmit={handleSubmit}>
        <button className="submitButton" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
      {object?.error && <p className="text-red-500">{object.error}</p>} {/* Display error message if any */}
      {object?.content && <p>{object.content}</p>} {/* Display content from the response if available */}
    </div>
  );
};

export default PostContents;
