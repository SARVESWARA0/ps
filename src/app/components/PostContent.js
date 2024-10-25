"use client";
import React, { useState, useEffect } from "react";
import { experimental_useObject as useObject } from "ai/react";

const PostContents = ({ fileNames, fileContents, loading, setLoading, setError }) => {
  const [chatStarted, setChatStarted] = useState(false);
  
  const { messages = [], object, submit } = useObject({
    api: "/api/chat",
    initialObject: {
      status_of_completion: "",
      code_complexity: "",
      evaluation_question: ""
    }
  });

  useEffect(() => {
    console.log("Object updated:", object);
  }, [object]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fileContents?.length) {
      setError("Please upload files before starting the analysis");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fileData = fileNames.map((name, index) => ({
        name,
        content: fileContents[index],
      }));

      const initialMessage = {
        role: "user",
        content: JSON.stringify({
          type: "file_submission",
          files: fileData
        })
      };

      await submit({ messages: [initialMessage] });
      
      setChatStarted(true);
      console.log("Submit response completed");
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = (message, index) => {
    let displayContent = message.content;
    try {
      const parsedContent = JSON.parse(message.content);
      if (parsedContent.type === "file_submission") {
        displayContent = "Files submitted for analysis: " + 
          parsedContent.files.map(f => f.name).join(", ");
      }
    } catch (e) {
      displayContent = message.content;
    }

    return (
      <div 
        key={index}
        className={`p-4 rounded-lg mb-4 ${
          message.role === "user" 
            ? "bg-blue-50 ml-auto max-w-[80%]" 
            : "bg-gray-50 mr-auto max-w-[80%]"
        }`}
      >
        <div className="text-sm text-gray-500 mb-1">
          {message.role === "user" ? "You" : "Assistant"}
        </div>
        <div className="text-gray-700">
          {displayContent}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Code Analysis Chat</h2>
        
        {!chatStarted && (
          <form onSubmit={handleSubmit}>
            <button 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit" 
              disabled={loading || !fileContents?.length}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⌛</span> 
                  Starting Analysis...
                </span>
              ) : (
                "Start Code Analysis"
              )}
            </button>
          </form>
        )}
      </div>

      {object?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {object.error}
        </div>
      )}

      <div className="space-y-4">
        {messages.length > 0 ? (
          messages.map((message, index) => renderMessage(message, index))
        ) : (
          <p>No messages yet. Start a new analysis to see results here.</p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {/* Analysis Results */}
      {object && object.status_of_completion && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <div className="completion">
            <h3 className="text-lg font-semibold mb-2">Status</h3>
            <p className="text-gray-700">{object.status_of_completion}</p>
          </div>
          <div className="complexity">
            {object.code_complexity && (
              <>
                <h3 className="text-lg font-semibold mb-2">Complexity Analysis</h3>
                <p className="text-gray-700">{object.code_complexity}</p>
              </>
            )}
          </div>
          {object.evaluation_question && (
            <div className="evaluation">
              <h3 className="text-lg font-semibold mb-2">Next Question</h3>
              <p className="text-gray-700 mb-4">{object.evaluation_question}</p>
              <ul className="list-disc pl-6">
                {object.options && object.options.length > 0 ? (
                  object.options.map((option, index) => (
                    <li key={index} className="text-gray-700">
                      {option}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-500">No options available</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostContents;
