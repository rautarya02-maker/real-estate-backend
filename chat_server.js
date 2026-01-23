import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "https://skyline-properties.netlify.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

app.options("/chat", cors());

app.get("/", (req, res) => {
  res.send("🤖 Skyline Estates Chatbot is running");
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ reply: "Please type a valid message." });
  }

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-chat",
        messages: [
          { role: "system", content: "You are Skyline Estates AI Assistant." },
          { role: "user", content: message }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );

    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    console.error("AI Error:", err.response?.data || err.message);
    res.status(500).json({ reply: "🤖 AI service is temporarily unavailable." });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Chatbot running on port ${PORT}`);
});
