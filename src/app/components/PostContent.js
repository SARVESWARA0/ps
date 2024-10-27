import React, { useState, useEffect } from "react";
import { experimental_useObject as useObject } from "ai/react";
import { Bars } from "react-loader-spinner";

const PostContents = ({ fileNames, fileContents, setLoading, setError }) => {
  const QUESTION_TIMEOUT = 15;
  const [chatStarted, setChatStarted] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [messages, setMessages] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [finalResults, setFinalResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMEOUT);
  const [timerActive, setTimerActive] = useState(false);
  const [feedbackArray, setFeedbackArray] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const { object, submit, isLoading } = useObject({
    api: "/api/chat",
    initialObject: {
      evaluation_question: "",
      options: [],
      feedback_on_prev_answer: "",
    },
  });

  const hideElements = () => {
    const elementsToHide = document.querySelectorAll(
      ".flex.items-center.gap-2, .dropzone-container.mb-4"
    );
    elementsToHide.forEach((element) => {
      element.style.display = "none";
    });
  };



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
      if (object.feedback_on_prev_answer) {
        setFeedbackArray((prev) => [...prev, object.feedback_on_prev_answer]);
      }
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
    hideElements();

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
          answer: selectedOption || "No answer",
          questionNumber: questionCount,
        }),
      };

      const updatedMessages = [...messages, userAnswer];
      setMessages(updatedMessages);

      const response = await submit({
        messages: updatedMessages,
        questionNumber: questionCount,
      });

      let feedbackText = object?.feedback_on_prev_answer || "No feedback";

      setFeedbackArray((prev) => [...prev, feedbackText]);

      setUserAnswers((prev) => [
        ...prev,
        {
          question: object.evaluation_question,
          options: object.options,
          selectedAnswer: selectedOption || "No answer",
          feedback: feedbackText,
        },
      ]);

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

  const handlePreview = () => {
    setShowPreview(true);
    console.log(feedbackArray)
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Code Analysis Chat</h2>
        {!chatStarted && (
          <form onSubmit={handleSubmit}>
            <button
              className="startanalysis"
              type="submit"
              disabled={isLoading || !fileContents?.length}
            >
              {isLoading ? (
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

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Bars color="#3B82F6" size={30} />
        </div>
      )}

      {object && object.evaluation_question && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
          <div className="evaluation">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Question {questionCount}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">⏱️</span>
                <span
                  className={`font-mono ${
                    timeLeft <= 5 ? "text-red-500" : "text-gray-600"
                  }`}
                >
                  {timeLeft}s
                </span>
              </div>
            </div>
            <p className="text-gray-700 mb-4">{object.evaluation_question}</p>
            {object.options && object.options.length > 0 ? (
              <ul className="space-y-2 flex flex-col">
                {object.options.map((option) => (
                  <li key={option} className="flex items-center mb-2">
                    <input
                      type="radio"
                      id={`option-${option}`}
                      name="answer"
                      value={option}
                      checked={selectedOption === option}
                      onChange={(e) => setSelectedOption(e.target.value)}
                      className="form-radio text-blue-500"
                    />
                    <label
                      htmlFor={`option-${option}`}
                      className="text-gray-700 ml-2"
                    >
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
              disabled={isLoading || selectedOption === null}
            >
              Next Question
            </button>

            {object?.feedback_on_prev_answer && questionCount > 1 && (
              <div className="mt-4 bg-blue-50 p-4 rounded">
                <p
                  className={`${
                    object.feedback_on_prev_answer.includes("Incorrect")
                      ? "text-red-500"
                      : object.feedback_on_prev_answer.includes("Correct")
                      ? "text-green-500"
                      : "text-blue-700"
                  }`}
                >
                  {object.feedback_on_prev_answer}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {finalResults && (
        <div className="bg-green-50 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Final Analysis Results</h3>
          <div className="space-y-2">
            <p>
              Status of Code Completion:{" "}
              {finalResults.status_of_code_completion}
            </p>
            <p>Complexity of Code: {finalResults.complexity_of_code}</p>
            <p>Number of Questions: {finalResults.Number_Of_Questions}</p>
            <p>Answered Correct: {finalResults.Answered_Correct}</p>
            <p>Final Score: {finalResults.final_score}%</p>
          </div>
          <br />
          <button
            onClick={() => location.reload()}
            className="upload_files_again"
          >
            Upload Files Again
          </button>
          <button onClick={handlePreview} className="upload_files_again">
            Preview
          </button>
        </div>
      )}

      {showPreview && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm mt-4">
          <h3 className="text-lg font-semibold mb-2">Preview of Answers</h3>
          {userAnswers.map((item, index) => (
            <div
              key={index}
              className="mb-4 p-4 border border-gray-200 rounded"
            >
              <h4 className="font-semibold">Question {index + 1}:</h4>
              <p className="text-gray-700 my-2">{item.question}</p>
              <p className="font-semibold">
                Your Answer: {item.selectedAnswer}
              </p>

              <ul className="space-y-2 mt-3 flex flex-col">
                {item.options && item.options.length > 0 ? (
                  item.options.map((option) => (
                    <li key={option} className="flex items-center">
                      <input
                        type="radio"
                        checked={item.selectedAnswer === option}
                        className="form-radio text-blue-500"
                        readOnly
                      />
                      <span className="text-gray-700 ml-2">{option}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">No options available</p>
                )}
              </ul>

              {index >= 1 && index <= 10 && feedbackArray[index] && (
                <div className="mt-4 bg-blue-50 p-4 rounded">
                  <p className="font-medium">Feedback:</p>
                  <p className="text-blue-700">{feedbackArray[index+1]}</p>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => setShowPreview(false)}
            className="mt-4 bg-gray-300 hover:bg-gray-400 text-black font-bold py-2 px-4 rounded transition-colors duration-200"
          >
            Close Preview
          </button>
        </div>
      )}
    </div>
  );
};

export default PostContents;
