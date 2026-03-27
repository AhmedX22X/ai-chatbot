require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: "https://ai-chatbot-amber-theta-29.vercel.app"
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    // Validation
    const userMessage = message?.trim();
    if (!userMessage) {
      return res.status(400).json({ error: "Message is required" });
    }
    if (userMessage.length > 4000) {
      return res.status(400).json({ error: "Message too long (max 4000 chars)" });
    }

    // Build messages with system prompt + history + current message
    const messages = [
      {
     role: "system",
content: `
You are a professional chatbot for a web design agency called AhmedToWeb.

Business Info:
- We create modern landing pages for businesses.
- Services: Landing page design, UI/UX, responsive websites.
- Price starts from $80 per project.
- Delivery time: 2–3 days.
- Contact: Fiverr or WhatsApp.

Your job:
- Answer clearly and confidently.
- Be helpful and slightly persuasive.
- If the user shows interest (price, service, order), ask for their name and WhatsApp number.
- Guide them toward placing an order.
- Keep answers short and clean.
`    },
      ...history.slice(-10),
      { role: "user", content: userMessage }
    ];

    // Timeout handling
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API Error:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Groq API request failed",
        code: data.error?.code || response.status
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || "No response from AI";

    res.json({
      reply,
      usage: data.usage,
      model: data.model
    });

  } catch (error) {
    console.error("Server error:", error);
    
    if (error.name === "AbortError") {
      return res.status(504).json({ error: "Request timeout - please try again" });
    }
    
    res.status(500).json({ 
      error: "Internal server error", 
      details: process.env.NODE_ENV === "development" ? error.message : undefined 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ AI-CHATBOT server running on http://localhost:${PORT}`);
  console.log(`🔗 Chat endpoint: POST /chat`);
  console.log(`💡 Health check: GET /health`);
});