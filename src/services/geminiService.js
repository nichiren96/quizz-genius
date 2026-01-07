
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Generates flashcards from the given text using Google Gemini API.
 * @param {string} text - The source text to generate flashcards from.
 * @returns {Promise<Array<{front: string, back: string, difficulty: string}>>}
 */
export async function generateFlashcards(text) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing. Please set VITE_GEMINI_API_KEY.");
  }

  const systemPrompt = `You are a helpful assistant that converts text into study flashcards. Output strictly valid JSON.
  Response Schema (Strict JSON):
  {
    "type": "object",
    "properties": {
      "topic": {
        "type": "string",
        "description": "A short, relevant title for this set of flashcards based on the content."
      },
      "flashcards": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "front": { "type": "string" },
            "back": { "type": "string" },
            "difficulty": { "type": "string", "enum": ["Easy", "Medium", "Hard"] }
          },
          "required": ["front", "back", "difficulty"]
        }
      }
    },
    "required": ["topic", "flashcards"]
  }`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          { text: `Text to process:\n${text}` }
        ]
      }
    ],
    generationConfig: {
        response_mime_type: "application/json"
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // Extracting the text from the response structure of Gemini API
    const candidate = data.candidates && data.candidates[0];
    const contentPart = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];
    const responseText = contentPart ? contentPart.text : null;

    if (!responseText) {
      throw new Error("Invalid response format from Gemini API.");
    }

    // Parse the JSON string
    try {
        let cleanText = responseText.trim();
        // Remove markdown code blocks if present (e.g. ```json ... ```)
        if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/```(?:json)?\n?/, '').replace(/```$/, '');
        }
        
        const result = JSON.parse(cleanText);
        // Validate basic structure
        if (!result.flashcards || !Array.isArray(result.flashcards)) {
             console.error("Invalid Structure:", result);
             throw new Error("Response JSON is missing 'flashcards' array.");
        }
        return result; // Returns { topic: "...", flashcards: [...] }
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.log("Raw Response Text:", responseText); // Log raw text for debugging
        throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
    }

  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
}
