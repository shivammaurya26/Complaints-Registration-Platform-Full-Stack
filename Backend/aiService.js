import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateFollowUpQuestion = async (complaintText) => {
  try {
    // Using gemini-1.5-flash for reliability
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a helpful assistant for a complaint registration platform. 
    The user has submitted the following complaint: "${complaintText}".
    Please generate exactly one short, relevant follow-up question to help understand the issue better.
    Return only the question text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text.trim();
  } catch (error) {
    console.error('Error generating AI question:', error);
    // Fallback if AI fails or model is not found
    return "Could you provide more details about when this happened?";
  }
};
