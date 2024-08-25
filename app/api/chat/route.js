import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import axios from "axios"; // Import axios for making requests

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
  const data = await req.json();

  // Initialize Pinecone
  const pc = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
  const index = pc.index("rag").namespace("ns1");

  // Hugging Face API details
  const HF_API_URL =
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"; // Update the model URL as needed
  const HF_API_KEY = process.env.HF_API_KEY; // Ensure you have this in your environment variables

  // Function to get embeddings from Hugging Face
  async function getEmbeddings(text) {
    try {
      const response = await axios.post(
        HF_API_URL,
        { inputs: text },
        { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
      );
      return response.data[0]; // Adjust based on the actual response format
    } catch (error) {
      console.error("Error fetching embeddings from Hugging Face:", error);
      throw error;
    }
  }

  const text = data[data.length - 1].content;
  const embedding = await getEmbeddings(text);

  // Query Pinecone with the embedding
  const results = await index.query({
    topK: 5,
    includeMetadata: true,
    vector: embedding,
  });

  let resultString = "";
  results.matches.forEach((match) => {
    resultString += `
  Returned Results:
  Professor: ${match.id}
  Review: ${match.metadata.stars}
  Subject: ${match.metadata.subject}
  Stars: ${match.metadata.stars}
  \n\n`;
  });

  const lastMessage = data[data.length - 1];
  const lastMessageContent = lastMessage.content + resultString;
  const lastDataWithoutLastMessage = data.slice(0, data.length - 1);

  // Generate response using Hugging Face
  const hfChatUrl = "https://api-inference.huggingface.co/models/gpt-neo-2.7B"; // Replace with the correct Hugging Face model URL
  const hfChatResponse = await axios.post(
    hfChatUrl,
    {
      inputs: {
        prompt: `${systemPrompt}\n\n${lastMessageContent}`,
        max_tokens: 150, // Adjust based on your needs
      },
    },
    { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
  );

  const responseContent = hfChatResponse.data.choices[0].text;

  return NextResponse.json({ message: responseContent });
}
