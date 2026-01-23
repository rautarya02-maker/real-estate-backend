import express from "express";
import axios from "axios";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Serve static website files
app.use(express.static(path.join(__dirname, "../")));

// Serve chat page
app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "../chat.html"));
});

// Chat API
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-chat",   // ✅ FIXED MODEL (works for everyone)
        messages: [
          {
            role: "system",
            content:
              "You are Skyline Estates AI Assistant. Help users with real estate questions, pricing, recommendations, and property advice.",
          },
          { role: "user", content: userMessage },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost",
          "X-Title": "Skyline Estates AI Assistant",
        },
      }
    );

    res.json({ reply: response.data.choices[0].message.content });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      reply: "Error: Unable to connect to AI server.",
    });
  }
});

app.listen(port, () => {
  console.log(`Chatbot server running at http://localhost:${port}`);
});
