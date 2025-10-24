import { GoogleGenAI } from "@google/genai";
import { TripData } from '../types';

let aiClient: GoogleGenAI | null = null;
let clientInitializationError: Error | null = null;

// Lazily initialize the AI client on first use
function getAiClient(): GoogleGenAI {
  if (clientInitializationError) {
    throw clientInitializationError;
  }
  if (aiClient) {
    return aiClient;
  }

  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    clientInitializationError = new Error("Gemini API Key not found. Please ensure it is configured in your environment.");
    console.error(clientInitializationError.message);
    throw clientInitializationError;
  }

  try {
    aiClient = new GoogleGenAI({ apiKey: API_KEY });
    return aiClient;
  } catch (error) {
    console.error("Error initializing GoogleGenAI client:", error);
    clientInitializationError = new Error("Failed to initialize Gemini client.");
    throw clientInitializationError;
  }
}


export async function generateDrivingSummary(tripData: TripData): Promise<string> {
  const model = 'gemini-2.5-flash';
  
  const prompt = `
    You are a helpful assistant that analyzes driving data and creates friendly, easy-to-read summaries for a family safety app.

    Based on the following trip data, generate a concise summary of about 3-4 sentences.
    - The summary should be positive and encouraging. If there are risky behaviors like speeding, mention them gently as a friendly reminder.
    - Start with a general overview of the trip (e.g., "Ben had a good drive from Work to Home today.").
    - Mention the duration and distance.
    - Highlight the maximum speed, comparing it to the speed limit.
    - Note any other events like hard braking.
    - Conclude with a safety-oriented sentence (e.g., "Overall, a safe trip!").
    - Do not use markdown formatting. The output should be a single paragraph of plain text.

    Trip Data:
    - Driver: ${tripData.driverName}
    - Date: ${tripData.date}
    - Duration: ${tripData.durationMinutes} minutes
    - Distance: ${tripData.distanceMiles} miles
    - Start Location: ${tripData.startLocation}
    - End Location: ${tripData.endLocation}
    - Max Speed: ${tripData.maxSpeed} mph (in a ${tripData.speedLimit} mph zone)
    - Average Speed: ${tripData.averageSpeed} mph
    - Hard Braking Events: ${tripData.hardBrakingEvents}
    - Rapid Acceleration Events: ${tripData.rapidAccelerationEvents}

    Generate the summary now.
  `;
  
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt
    });
    return response.text;
  } catch (error) {
    console.error("Error generating driving summary:", error);
    // Re-throw the original, more specific error if it exists
    throw clientInitializationError || new Error("Failed to generate summary from Gemini API.");
  }
}

export async function generateIconForZone(zoneName: string): Promise<string> {
  const model = 'gemini-2.5-flash';
  const defaultEmoji = '📍';

  const prompt = `
    You are an expert emoji selector. Based on the provided place name, return a single, relevant emoji that best represents it.
    - Return ONLY the emoji character itself, with no additional text, explanation, or formatting.
    - If the name is ambiguous, choose the most common representation (e.g., "Park" -> 🌳).
    - For a business name, choose an emoji that represents the business type (e.g., "Starbucks" -> ☕).

    Place Name: "${zoneName}"

    Emoji:
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt
    });
    const emoji = response.text.trim();
    // Basic validation to see if the response is likely an emoji
    if (emoji && emoji.length <= 4) {
        return emoji;
    }
    return defaultEmoji;
  } catch (error) {
    console.error("Error generating zone icon:", error);
    // Don't throw here, just return the default so the UI doesn't break
    return defaultEmoji;
  }
}
