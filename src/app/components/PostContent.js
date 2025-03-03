"use client"
import { useState, useEffect, useCallback } from "react"
import { experimental_useObject as useObject } from "ai/react"
import { Bars } from "react-loader-spinner"


const CodeEvaluationQuiz = ({ fileNames, fileContents, setLoading, setError }) => {
  const QUESTION_TIMEOUT = 30
  const [chatStarted, setChatStarted] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [messages, setMessages] = useState([])
  const [questionCount, setQuestionCount] = useState(0)
  const [finalResults, setFinalResults] = useState(null)
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMEOUT)
  const [timerActive, setTimerActive] = useState(false)
  const [userAnswers, setUserAnswers] = useState([])
  const [waitingForResponse, setWaitingForResponse] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [showReview, setShowReview] = useState(false)

  const {
    object,
    submit,
    isLoading: aiLoading,
  } = useObject({
    api: "/api/chat",
    initialObject: {
      evaluation_question: "",
      options: [],
      feedback_on_prev_answer: "",
    },
  })

  // Helper function to style feedback
  const getFeedbackStyle = (feedback) => {
    if (!feedback) return "text-gray-700 bg-gray-100"
    if (feedback.includes("Incorrect")) return "text-red-700 bg-red-50"
    if (feedback.includes("Correct")) return "text-green-700 bg-green-50"
    return "text-blue-700 bg-blue-50"
  }

  const getCorrectAnswersCount = (answers) => {
    return answers.filter((answer) => answer.feedback && answer.feedback.includes("Correct")).length
  }

  // Hide file upload section once quiz starts.
  const hideElements = () => {
    const elementsToHide = document.querySelectorAll(".dropzone-container, .file-upload-section")
    elementsToHide.forEach((element) => {
      element.style.display = "none"
    })
  }

  const handleNextQuestion = useCallback(async () => {
    setTimerActive(false)
    setWaitingForResponse(true)
    try {
      const userAnswer = {
        role: "user",
        content: JSON.stringify({
          type: "answer_submission",
          answer: selectedOption || "No answer",
          questionNumber: questionCount,
        }),
      }
      const updatedMessages = [...messages, userAnswer]
      setMessages(updatedMessages)
      await submit({
        messages: updatedMessages,
        questionNumber: questionCount,
      })
      const feedbackText = object?.feedback_on_prev_answer || "No feedback"
      setUserAnswers((prev) => [
        ...prev,
        {
          question: currentQuestion,
          options: object.options,
          selectedAnswer: selectedOption || "No answer",
          feedback: feedbackText,
          questionNumber: questionCount,
        },
      ])
      setSelectedOption(null)
      setQuestionCount((prev) => prev + 1)
      setTimeLeft(QUESTION_TIMEOUT)
    } catch (error) {
      console.error("Error:", error)
      setError(error.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
      // Let the feedback/loading display for a brief moment before moving on
      setTimeout(() => {
        setWaitingForResponse(false)
      }, 1500)
    }
  }, [messages, questionCount, selectedOption, submit, object, setError, setLoading, currentQuestion])

  useEffect(() => {
    let timer
    if (timerActive && timeLeft > 0 && !waitingForResponse) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
    } else if (timeLeft === 0 && object?.evaluation_question && !waitingForResponse) {
      handleNextQuestion()
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [timerActive, timeLeft, handleNextQuestion, object?.evaluation_question, waitingForResponse])

  useEffect(() => {
    if (object?.evaluation_question && !waitingForResponse) {
      setTimeLeft(QUESTION_TIMEOUT)
      setTimerActive(true)
      setCurrentQuestion(object.evaluation_question)
    }
  }, [object?.evaluation_question, waitingForResponse])

  useEffect(() => {
    if (object && object.evaluation_question) {
      const aiMessage = {
        role: "assistant",
        content: JSON.stringify({
          type: "evaluation_question",
          question: object.evaluation_question,
          options: object.options,
        }),
      }
      setMessages((prevMessages) => [...prevMessages, aiMessage])
      setCurrentQuestion(object.evaluation_question)
    } else if (object && object.status_of_code_completion) {
      setFinalResults(object)
      setTimerActive(false)
      if (object.feedback_on_prev_answer && userAnswers.length > 0) {
        setUserAnswers((prev) => {
          const updated = [...prev]
          updated[updated.length - 1].feedback = object.feedback_on_prev_answer
          return updated
        })
      }
    }
  }, [object, userAnswers])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fileContents?.length) {
      setError("Please upload files before starting the analysis")
      return
    }
    setLoading(true)
    setError(null)
    hideElements()
    try {
      const fileData = fileNames.map((name, index) => ({
        name,
        content: fileContents[index],
      }))
      const initialMessage = {
        role: "user",
        content: JSON.stringify({
          type: "file_submission",
          files: fileData,
        }),
      }
      setMessages([initialMessage])
      await submit({ messages: [initialMessage] })
      setChatStarted(true)
      setQuestionCount(1)
    } catch (error) {
      console.error("Error:", error)
      setError(error.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = () => {
    return questionCount > 0 ? Math.min((questionCount - 1) * 10, 100) : 0
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <h2 className="text-3xl font-bold text-blue-800 mb-8 text-center">Code Evaluation Quiz</h2>

      {/* Pre-quiz file upload section */}
      {!chatStarted && (
        <div className="max-w-lg mx-auto bg-white p-8 rounded-lg border border-gray-200 shadow-sm file-upload-section">
          <p className="mb-6 text-gray-700 leading-relaxed">
            Start the analysis to evaluate your code through a series of multiple-choice questions. Our AI will analyze
            your code and test your understanding.
          </p>
          <form onSubmit={handleSubmit}>
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center"
              type="submit"
              disabled={aiLoading || !fileContents?.length}
            >
              {aiLoading ? (
                <span className="flex items-center gap-2">
                  <Bars color="#FFFFFF" height={24} width={24} />
                  Starting Analysis...
                </span>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Start Code Analysis
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Quiz Section */}
      {chatStarted && (
        <div className="max-w-3xl mx-auto mt-8 space-y-6">
          {/* Progress Bar */}
          {questionCount > 0 && questionCount <= 10 && !finalResults && (
            <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-in-out"
                style={{ width: `${calculateProgress()}%` }}
              ></div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">Progress</p>
                <p className="text-xs font-medium text-gray-700">Question {questionCount} of 10</p>
              </div>
            </div>
          )}

          {/* Current Question or Loading between questions */}
          {object &&
            object.evaluation_question &&
            !finalResults &&
            (waitingForResponse ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Bars color="#3B82F6" height={40} width={40} />
                <p className="mt-4 text-gray-600">Loading next question...</p>
                {object?.feedback_on_prev_answer && (
                  <div className={`mt-4 p-4 rounded-lg ${getFeedbackStyle(object.feedback_on_prev_answer)}`}>
                    <p className="font-medium mb-1">Feedback:</p>
                    <p className="leading-relaxed">{object.feedback_on_prev_answer}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 transition-all duration-300 hover:shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-blue-800">Question {questionCount}</h3>
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                    <span className="text-gray-600">⏱️</span>
                    <span className={`font-mono ${timeLeft <= 5 ? "text-red-500 font-bold" : "text-gray-600"}`}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>
                <p className="text-gray-700 mb-6 text-lg leading-relaxed">{object.evaluation_question}</p>
                {object.options && object.options.length > 0 ? (
                  <ul className="flex flex-col gap-3">
                    {object.options.map((option, index) => (
                      <li
                        key={option}
                        className={`border rounded-lg transition-all duration-200 ${
                          selectedOption === option
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        <label htmlFor={`option-${index}`} className="flex items-center p-4 cursor-pointer">
                          <input
                            type="radio"
                            id={`option-${index}`}
                            name="answer"
                            value={option}
                            checked={selectedOption === option}
                            onChange={(e) => setSelectedOption(e.target.value)}
                            className="form-radio h-5 w-5 text-blue-600"
                          />
                          <span className="text-gray-700 ml-3">
                            <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                            {option}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No options available</p>
                )}
                <div className="mt-6 flex justify-between items-center">
                  <p className="text-sm text-gray-500">Select an option to continue</p>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg shadow-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    onClick={handleNextQuestion}
                    disabled={aiLoading || selectedOption === null || waitingForResponse}
                  >
                    Submit Answer
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 ml-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                {/* Detailed feedback display (for questions beyond the first) */}
                {object?.feedback_on_prev_answer && questionCount > 1 && (
                  <div className="mt-6 rounded-lg overflow-hidden">
                    <div className={`p-4 ${getFeedbackStyle(object.feedback_on_prev_answer)}`}>
                      <div className="flex items-start">
                        <span className="mr-2 mt-0.5">
                          {object.feedback_on_prev_answer.includes("Correct") ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-green-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          ) : object.feedback_on_prev_answer.includes("Incorrect") ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-red-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-blue-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          )}
                        </span>
                        <p className="leading-relaxed">{object.feedback_on_prev_answer}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

          {/* Final Results Section */}
          {finalResults && (
            <div className="bg-white p-8 rounded-lg shadow-md transition-all duration-300 hover:shadow-xl border border-gray-200">
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-blue-100 text-blue-800 text-3xl font-bold mb-4">
                  {finalResults.final_score}%
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-800">Analysis Complete</h3>
                <p className="text-gray-600">Here's your code assessment summary</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Code Completion</h4>
                  <p
                    className={`text-2xl font-bold ${Number.parseInt(finalResults.final_score) >= 75 ? "text-green-600" : "text-red-600"}`}
                  >
                    {Number.parseInt(finalResults.final_score) >= 75 ? "Completed" : "Assessment Not Completed"}
                  </p>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Code Complexity</h4>
                  <p className="text-2xl font-bold text-gray-800">{finalResults.complexity_of_code}</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Total Questions</h4>
                  <p className="text-2xl font-bold text-gray-800">{finalResults.Number_Of_Questions}</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Correct Answers</h4>
                  <p className="text-2xl font-bold text-gray-800">
                    {getCorrectAnswersCount(userAnswers)} / {finalResults.Number_Of_Questions}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => location.reload()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-8 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center border border-gray-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Upload New Files
                </button>
                <button
                  onClick={() => setShowReview(!showReview)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg shadow-sm transition-all duration-300 flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {showReview ? "Hide Answers" : "Review Answers"}
                </button>
              </div>
            </div>
          )}

          {/* Review Answers Section */}
          {showReview && (
            <div className="bg-white p-6 rounded-lg shadow-md mt-6 border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Your Answers</h3>
                <button onClick={() => setShowReview(false)} className="text-gray-500 hover:text-gray-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-6">
                {userAnswers.map((item, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-md"
                  >
                    <div className="bg-gray-50 p-4 border-b">
                      <h4 className="font-semibold text-gray-800">Question {index + 1}</h4>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-700 mb-4 leading-relaxed">{item.question}</p>
                      <div className="space-y-2">
                        {item.options &&
                          item.options.map((option, optIndex) => (
                            <div
                              key={option}
                              className={`p-3 rounded-lg ${
                                item.selectedAnswer === option
                                  ? "bg-blue-50 border border-blue-200"
                                  : "bg-gray-50 border border-gray-200"
                              }`}
                            >
                              <div className="flex items-center">
                                <span className="h-6 w-6 mr-3 flex items-center justify-center rounded-full border border-gray-300 bg-white text-sm">
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span className="text-gray-700">{option}</span>
                                {item.selectedAnswer === option && (
                                  <span className="ml-auto">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5 text-blue-600"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                      {item.feedback && (
                        <div className={`mt-4 p-4 rounded-lg ${getFeedbackStyle(item.feedback)}`}>
                          <p className="font-medium mb-1">Feedback:</p>
                          <p className="leading-relaxed">{item.feedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CodeEvaluationQuiz

