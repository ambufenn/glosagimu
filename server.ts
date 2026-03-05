import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// --- Glossa Neural Engine Simulation ---
class GlossaNeuralEngine {
  // Simulates a CNN/LSTM mapping signal patterns to intent tokens
  // In a real scenario, this would load a TensorFlow/PyTorch model
  processSignals(signals: number[]): string {
    const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
    const max = Math.max(...signals);
    
    // Mock mapping logic
    if (max > 0.8 && avg > 0.5) return "INTENT_URGENT_HELP";
    if (max > 0.6 && avg > 0.3) return "INTENT_THIRSTY";
    if (max > 0.4 && avg > 0.2) return "INTENT_GREETING";
    if (max < 0.2) return "INTENT_REST";
    return "INTENT_UNKNOWN";
  }
}

const engine = new GlossaNeuralEngine();

// Offline Fallback Dictionary
const FALLBACK_MAP: Record<string, string> = {
  "INTENT_URGENT_HELP": "I need help immediately.",
  "INTENT_THIRSTY": "I am thirsty.",
  "INTENT_GREETING": "Hello, how are you?",
  "INTENT_REST": "I want to rest.",
  "INTENT_UNKNOWN": "Something is on my mind, but I can't express it clearly."
};

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // API Routes
  app.post("/api/process-signals", async (req, res) => {
    try {
      const { signals, profile } = req.body;
      
      if (!signals || !Array.isArray(signals)) {
        return res.status(400).json({ error: "Invalid signals data" });
      }

      const token = engine.processSignals(signals);
      
      // AI Integration with Gemini
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = "gemini-3-flash-preview"; // Fast model for low latency
        
        const prompt = `
          You are Glossa AI, a neural-to-speech assistant for a silent patient.
          Convert the following intent token into a natural, human sentence.
          
          Intent Token: ${token}
          Patient Profile: ${profile || "Standard"}
          
          Context: The patient is in a hospital/home care setting in Indonesia.
          If the profile mentions 'formal', use polite Indonesian/English.
          Return ONLY the translated sentence.
        `;

        const result = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.3, // Low temperature for consistency
          }
        });

        const speech = result.text?.trim() || FALLBACK_MAP[token];
        res.json({ token, speech, source: "gemini" });
      } catch (aiError) {
        console.error("Gemini API Error, using fallback:", aiError);
        res.json({ 
          token, 
          speech: FALLBACK_MAP[token], 
          source: "fallback",
          warning: "Offline mode active" 
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Glossa Server running on http://localhost:${PORT}`);
  });
}

startServer();
