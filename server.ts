import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Glossa Neural Engine Simulation ---
class GlossaNeuralEngine {
  processSignals(signals: number[]): string {
    const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
    const max = Math.max(...signals);

    if (max > 0.8 && avg > 0.5) return "INTENT_URGENT_HELP";
    if (max > 0.6 && avg > 0.3) return "INTENT_THIRSTY";
    if (max > 0.4 && avg > 0.2) return "INTENT_GREETING";
    if (max < 0.2) return "INTENT_REST";
    return "INTENT_UNKNOWN";
  }
}

const engine = new GlossaNeuralEngine();

// Offline fallback
const FALLBACK_MAP: Record<string, string> = {
  INTENT_URGENT_HELP: "I need help immediately.",
  INTENT_THIRSTY: "I am thirsty.",
  INTENT_GREETING: "Hello, how are you?",
  INTENT_REST: "I want to rest.",
  INTENT_UNKNOWN: "Something is on my mind, but I can't express it clearly."
};

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = process.env.PORT || 3000;

  // ==========================
  // API ROUTE
  // ==========================
  app.post("/api/process-signals", async (req, res) => {
    try {
      const { signals, profile } = req.body;

      if (!signals || !Array.isArray(signals)) {
        return res.status(400).json({ error: "Invalid signals data" });
      }

      const token = engine.processSignals(signals);

      try {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("Missing GEMINI_API_KEY");
        }

        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY
        });

        const prompt = `
You are Glossa AI, a neural-to-speech assistant.
Convert this intent token into a natural sentence.

Intent Token: ${token}
Patient Profile: ${profile || "Standard"}

Context: Hospital or home care setting in Indonesia.
Return ONLY the translated sentence.
`;

        const result = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: prompt,
          config: { temperature: 0.3 }
        });

        const speech = result.text?.trim() || FALLBACK_MAP[token];

        return res.json({
          token,
          speech,
          source: "gemini"
        });

      } catch (aiError) {
        console.error("Gemini failed, using fallback:", aiError);

        return res.json({
          token,
          speech: FALLBACK_MAP[token],
          source: "fallback",
          warning: "Offline mode active"
        });
      }

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==========================
  // DEV MODE (VITE)
  // ==========================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });

    app.use(vite.middlewares);
  }

  // ==========================
  // PRODUCTION STATIC SERVE
  // ==========================
  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "../dist");

    app.use(express.static(distPath));

    app.get("*", (_, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Glossa running on port ${PORT}`);
  });
}

startServer();
