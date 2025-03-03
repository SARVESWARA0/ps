import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

// Environment variable for API key with fallback
const apiKey = process.env.GOOGLE_AI_API_KEY || '';

// Configuration variables for quiz
const QUIZ_CONFIG = {
  totalQuestions: 10,
  easyQuestions: 4,
  mediumQuestions: 4,
  hardQuestions: 2
};

const google = createGoogleGenerativeAI({
  apiKey,
});

// Function to generate the system prompt with dynamic configuration
const generateSystemPrompt = (config, isNoAnswer = false) => {
  const basePrompt = {
    persona: "Your name is CodEva, a full-stack project code evaluation assistant.",
    scenario: "A zip file containing full-stack code files is uploaded by the user. You are provided with the extracted content from this zip file for evaluation.",
    role: "You are responsible for evaluating the provided code files, which may include back-end code (e.g., Node.js, Express) and front-end code (e.g., JavaScript, HTML, CSS, React, or TypeScript) by obeying the rules provided. Your task is to analyze the code and generate questions in the form of Multiple-Choice Questions (MCQs) with 4 options based on the code content. Additionally, you will assess the answers provided by the user to these questions and give feedback on their correctness.",
    instructions: [
      `1. Generate ${config.totalQuestions} Multiple-Choice Questions (MCQs) one by one, each with 4 options. Divide them into difficulty levels:`,
      `   - Easy Level (${config.easyQuestions} questions): Basic concepts from the code.`,
      `   - Medium Level (${config.mediumQuestions} questions): More complex features and patterns.`,
      `   - Hard Level (${config.hardQuestions} questions): Advanced or tricky aspects of the code.`,
      "2. Evaluate User Responses: When a user answers a question, analyze the response and provide feedback before generating the next question.",
      "3. Stay Within Scope: Limit your questions and evaluation strictly to the provided code content.",
      `4. After ${config.totalQuestions} questions, review the user's responses, calculate the code complexity (High/Medium/Low), and determine the project completion percentage (scale of 1 to 100%).`,
      "5. Shuffle the options frequently, don't repeat questions, and cover different parts of the code.",
      "6. Provide the correct feedback for each answer as follows:",
      "   - If the answer is correct, respond with exactly 'Correct'.",
      "   - If the answer is incorrect, respond with exactly 'Incorrect'.",
      "   - If no option is selected, respond with 'No option selected. The correct answer is [correct option]'.",
      "7. Do not skip any questions and always provide feedback before the next question."
    ],
    rules: [
      "Do not ask about the status_of_completion, code_complexity, or marking systems.",
      "Do not ask personal information or configuration file details.",
      "Only ask technical questions related to the code.",
      "Increase the difficulty gradually.",
      "Provide feedback exactly as specified: 'Correct', 'Incorrect', or 'No option selected. The correct answer is [correct option]'.",
      "Never repeat questions or ask similar questions.",
      "If no option is selected, include the correct answer in the feedback."
    ],
    additional_notes: [
      "Output the question, options, and feedback strictly following the zod schema.",
      "Ensure that one of the four options is correct.",
      "If no option is selected, output exactly 'No option selected. The correct answer is [correct option]'.",
      "Calculate the final score based on the user's responses.",
      "The tone should be formal and informative, helping the user improve their code knowledge."
    ],
    remember:
      "Always label the options as A, B, C, and D. Provide the correct feedback as 'Correct' for right answers, 'Incorrect' for wrong answers, and 'No option selected. The correct answer is [correct option]' when applicable. Do not include additional phrasing in the feedback.",
    marking_scheme:
      "Status_Of_Project_Completion: 30 points, Code_Complexity: 20 points, Correct_Answers: 50 points. Total Final Score = 100. Negative points for wrong answers = 2.5 points. No negative points for unanswered questions or no option selected."
  };
  
  // If no answer was provided, add specific instruction to the system prompt
  if (isNoAnswer) {
    basePrompt.no_answer_instruction = "No option selected. The correct answer is [correct option].";
  }
  
  return JSON.stringify(basePrompt);
};

export async function POST(req) {
  try {
    const { messages, questionNumber } = await req.json();

    // Process the last message to check if an answer was submitted
    const lastMessage = messages[messages.length - 1];
    let isNoAnswer = false;
    
    if (lastMessage && lastMessage.role === "user") {
      try {
        const content = typeof lastMessage.content === "string" 
          ? JSON.parse(lastMessage.content) 
          : lastMessage.content;
          
        if (content.type === "answer_submission" && 
            (content.answer === "No answer" || content.answer === "No option selected" || !content.answer)) {
          isNoAnswer = true;
        }
      } catch (e) {
        console.log("Could not parse user message content", e);
      }
    }

    // Format messages for the AI SDK
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === "object" ? JSON.stringify(msg.content) : msg.content,
    }));
    
    // Define Zod schemas for validation
    const question_schema = z.object({
      evaluation_question: z.string(),
      options: z.array(z.string()),
      feedback_on_prev_answer: z.string(),
    });

    const result_schema = z.object({
      feedback_on_prev_answer: z.string(),
      status_of_code_completion: z.string(),
      complexity_of_code: z.string(),
      Number_Of_Questions: z.number(),
      Answered_Correct: z.number(),
      final_score: z.number(),
    });

    // Choose appropriate schema based on question number
    let output_schema = question_schema;
    if (lastMessage.role === "user" && questionNumber === QUIZ_CONFIG.totalQuestions) {
      output_schema = result_schema;
    }

    // Generate the system prompt using the config and isNoAnswer flag
    const system_prompt = generateSystemPrompt(QUIZ_CONFIG, isNoAnswer);

    // Call the AI model
    const result = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: output_schema,
      messages: formattedMessages,
      maxSteps: 5,
      temperature: 1,
      system: system_prompt,
    });

    // If no answer was selected but the feedback doesn't reflect that, modify it
    if (isNoAnswer && !result.object.feedback_on_prev_answer.startsWith("No option selected")) {
      const correctAnswer = result.object.feedback_on_prev_answer.match(/[ABCD]/) 
        ? result.object.feedback_on_prev_answer.match(/[ABCD]/)[0]
        : "Unknown";
        
      result.object.feedback_on_prev_answer = 
        `No option selected. The correct answer is ${correctAnswer}.`;
    }

    return Response.json(result.object);
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
