const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?$/);
      if (match) {
        process.env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
      }
    });
  }
}
loadEnv();

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.VITE_OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Test Scraper"
  }
});

const schema = {
  name: "test_schema",
  strict: true,
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      confianca: { type: "boolean" },
      hours: {
        type: "object",
        properties: {
          monday: {
            type: "object",
            properties: {
              isOpen: { type: "boolean" }
            },
            required: ["isOpen"],
            additionalProperties: false
          }
        },
        required: ["monday"],
        additionalProperties: false
      }
    },
    required: ["name", "confianca", "hours"],
    additionalProperties: false
  }
};

async function test() {
  const models = [
    "google/gemini-flash-1.5:free",
    "openrouter/free"
  ];

  for (const model of models) {
    console.log(`\nTesting model: ${model}...`);
    try {
      const completion = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: "You are a helpful assistant. Output structured JSON." },
          { role: "user", content: "Return name: 'Nau', confianca: true, monday isOpen: true" }
        ],
        response_format: { type: "json_schema", json_schema: schema }
      });
      console.log("Response:", completion.choices[0].message.content);
    } catch (err) {
      console.error("Error:", err.message);
    }
  }
}

test();
