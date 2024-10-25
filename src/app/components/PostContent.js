"use client";
import React, { useState, useEffect } from "react";
import { experimental_useObject as useObject } from "ai/react";

const PostContents = ({ fileNames, fileContents, loading, setLoading, setError }) => {
  const [chatStarted, setChatStarted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  
  const { messages = [], object, submit } = useObject({
    api: "/api/chat",
    initialObject: {
      evaluation_question: "",
      options: [] // Initialize options to an empty array
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

  const handleNextQuestion = async () => {
    if (!selectedOption) {
      setError("Please select an option before proceeding");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextQuestionMessage = {
        role: "user",
        content: JSON.stringify({
          type: "answer_submission",
          answer: selectedOption
        })
      };

      await submit({ messages: [nextQuestionMessage] });
      setSelectedOption(null); // Reset the selection after submission
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

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      )}

      {/* Analysis Results */}
      {object && object.evaluation_question && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          {object.evaluation_question && (
            <div className="evaluation">
              <h3 className="text-lg font-semibold mb-2">Next Question</h3>
              <p className="text-gray-700 mb-4">{object.evaluation_question}</p>
              {object.options && object.options.length > 0 ? (
                <ul className="list-disc pl-6">
                  {object.options.map((option) => (
                    <li key={option} className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        id={`option-${option}`} 
                        name="answer" 
                        value={option} 
                        checked={selectedOption === option}
                        onChange={(e) => setSelectedOption(e.target.value)}
                        className="form-radio text-blue-500"
                      />
                      <label htmlFor={`option-${option}`} className="text-gray-700">{option}</label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No options available</p>
              )}
              <button 
                className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleNextQuestion}
                disabled={loading || !selectedOption}
              >
                Next Question
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostContents;
