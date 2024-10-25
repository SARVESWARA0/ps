"use client";
import React, { useState, useEffect } from "react";
import { experimental_useObject as useObject } from "ai/react";

const QUESTION_TIMEOUT = 10; 

const PostContents = ({
  fileNames,
  fileContents,
  loading,
  setLoading,
  setError,
}) => {
  const [chatStarted, setChatStarted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [messages, setMessages] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [finalResults, setFinalResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMEOUT);
  const [timerActive, setTimerActive] = useState(false);

  const { object, submit } = useObject({
    api: "/api/chat",
    initialObject: {
      evaluation_question: "",
      options: [],
    },
  });

  // Timer effect
  useEffect(() => {
    let timer;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && object?.evaluation_question) {
      handleNextQuestion();
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timerActive, timeLeft]);

  
  useEffect(() => {
    if (object?.evaluation_question) {
      setTimeLeft(QUESTION_TIMEOUT);
      setTimerActive(true);
    }
  }, [object?.evaluation_question]);

  useEffect(() => {
    if (object && object.evaluation_question) {
      const aiMessage = {
        role: "assistant",
        content: JSON.stringify({
          type: "evaluation_question",
          question: object.evaluation_question,
          options: object.options,
        }),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } else if (object && object.status_of_code_completion) {
      setFinalResults(object);
      setTimerActive(false);
    }
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
          files: fileData,
        }),
      };

      setMessages([initialMessage]);
      await submit({ messages: [initialMessage] });
      setChatStarted(true);
      setQuestionCount(1);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    setTimerActive(false);
    
    try {
      const userAnswer = {
        role: "user",
        content: JSON.stringify({
          type: "answer_submission",
          answer: selectedOption || "No answer", // Submit "No answer" if time runs out
          questionNumber: questionCount,
        }),
      };

      const updatedMessages = [...messages, userAnswer];
      setMessages(updatedMessages);

      const response = await submit({ 
        messages: updatedMessages, 
        questionNumber: questionCount 
      });

      if (response?.object?.status_of_code_completion) {
        setFinalResults(response.object);
      }

      setSelectedOption(null);
      setQuestionCount((prev) => prev + 1);
      setTimeLeft(QUESTION_TIMEOUT);
    } catch (error) {
      console.error("Error:", error);
      setError(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
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

      {object && object.evaluation_question && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <div className="evaluation">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Question {questionCount}</h3>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">⏱️</span>
                <span className={`font-mono ${
                  timeLeft <= 5 ? 'text-red-500' : 'text-gray-600'
                }`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
            <p className="text-gray-700 mb-4">{object.evaluation_question}</p>
            {object.options && object.options.length > 0 ? (
              <ul className="space-y-2">
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
                    <label htmlFor={`option-${option}`} className="text-gray-700">
                      {option}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No options available</p>
            )}
            <button
              className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleNextQuestion}
              disabled={loading}
            >
              Next Question
            </button>
          </div>
        </div>
      )}

      {finalResults && (
        <div className="bg-green-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Final Analysis Results</h3>
          <div className="space-y-2">
            <p>Status of Code Completion: {finalResults.status_of_code_completion}</p>
            <p>Complexity of Code: {finalResults.complexity_of_code}</p>
            <p>Number of Questions: {finalResults.Number_Of_Questions}</p>
            <p>Answered Correct: {finalResults.Answered_Correct}</p>
            <p>Final Score: {finalResults.final_score}%</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostContents;