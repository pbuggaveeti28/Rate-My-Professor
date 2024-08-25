import { NextResponse } from "next/server";
import axios from "axios";

const systemPrompt = `
You are an AI assistant for a RateMyProfessor-style service. Your role is to help students find professors based on their queries using a Retrieval-Augmented Generation (RAG) system. For each user question, you will provide information on the top 3 most relevant professors.

Your knowledge base contains professor reviews, ratings, and course information. When a user asks a question, you should:

1. Interpret the user's query to understand their needs (e.g., subject area, teaching style, difficulty level).
2. Use the RAG system to retrieve information on the 3 most relevant professors based on the query.
3. Present the information for each professor in a clear, concise format, including:
   - Professor's name
   - Subject area
   - Overall rating (out of 5 stars)
   - A brief summary of student reviews
   - Any standout characteristics or teaching methods

4. If applicable, provide a brief explanation of why these professors were selected based on the user's query.

5. Offer to provide more details or answer follow-up questions about any of the suggested professors.

Remember to maintain a helpful and neutral tone. Your goal is to assist students in making informed decisions about their course selections based on professor reviews and ratings.

If a user's query is unclear or too broad, ask for clarification to provide more accurate and helpful results.

Always respect privacy and ethical guidelines. Do not share any private or sensitive information about professors or students.

Begin each interaction by waiting for the user's query about finding a professor.
`;

export async function POST(req) {
  try {
    const data = await req.json();

    console.log("Received Data:", data); // Log received data

    // OpenRouter API details
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    // Fetch response from OpenRouter
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\n${data[data.length - 1].content}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("OpenRouter API Response:", response.data); // Log API response

    // Extract and format the response content
    const responseContent = response.data.choices
      ? response.data.choices[0].message.content
      : "No response generated";

    // Format the response content to improve readability
    const formattedResponse = `
    Here are some relevant professors based on your query:

    ${responseContent}
    `;

    return NextResponse.json({ message: formattedResponse });
  } catch (error) {
    console.error("Error processing request:", error); // Log errors
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}
