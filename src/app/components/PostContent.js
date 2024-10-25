"use client";
import React, { useState } from "react";
import { experimental_useObject as useObject } from "ai/react";

const PostContents = ({ fileNames, fileContents, loading, setLoading, setError }) => {
  const [response, setResponse] = useState(null);
  
  const { messages, object, submit } = useObject({
    api: "/api/chat",
    initialObject: {
      status_of_completion: "",
      code_complexity: "",
      evaluation_question: ""
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fileContents?.length) {
      setError("Please upload files before analyzing");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fileData = fileNames.map((name, index) => ({
        name,
        content: fileContents[index],
      }));
      
      const result = await submit({ files: fileData });
      
     


      setResponse(result);
      
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderResponseSection = (title, content) => (
    <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-700">{content}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Code Analysis</h2>
        
        <form onSubmit={handleSubmit}>
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
            type="submit" 
            disabled={loading || !fileContents?.length}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⌛</span> 
                Analyzing...
              </span>
            ) : (
              "Analyze Code"
            )}
          </button>
        </form>
      </div>

      {/* Error Display */}
      {object?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {object.error}
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          {renderResponseSection("Completion Status", response.status_of_completion)}
          {renderResponseSection("Code Complexity", response.code_complexity)}
          {renderResponseSection("Evaluation Question", response.evaluation_question)}
        </div>
      )}
    </div>
  );
};

export default PostContents;