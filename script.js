require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware agar HTML (Frontend) bisa berkomunikasi dengan server (Backend) ini
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Limit diperbesar agar bisa menerima teks panjang

// ==========================================
// 1. ENDPOINT GEMINI API
// ==========================================
app.post('/api/gemini', async (req, res) => {
    try {
        const { prompt, system, schema } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey || apiKey.includes('ISI_DENGAN')) {
            throw new Error("API Key Gemini belum disetting di file .env");
        }

        // Menggunakan model gemini-1.5-flash yang cepat dan stabil
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: system }] },
            generationConfig: {
                responseMimeType: schema ? "application/json" : "text/plain",
            }
        };

        // Jika ada struktur JSON (schema) yang diminta
        if (schema) {
            payload.generationConfig.responseSchema = schema;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Gemini Error: ${errorData}`);
        }

        const data = await response.json();
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        res.json({ result: resultText });

    } catch (error) {
        console.error("❌ Gemini API Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 2. ENDPOINT OPENAI API (CHATGPT)
// ==========================================
app.post('/api/openai', async (req, res) => {
    try {
        const { prompt, system, schema } = req.body;
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey || apiKey.includes('ISI_DENGAN')) {
            throw new Error("API Key OpenAI belum disetting di file .env");
        }

        const payload = {
            model: "gpt-4o-mini", // Model GPT yang murah dan cepat
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt }
            ]
        };

        // Jika meminta output JSON
        if (schema) {
            payload.response_format = { type: "json_object" };
            // Beri tahu AI struktur JSON yang diinginkan
            payload.messages[0].content += `\n\nANDA WAJIB MENGEMBALIKAN FORMAT JSON YANG VALID SESUAI SKEMA INI: ${JSON.stringify(schema)}`;
        }

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI Error: ${errorData}`);
        }

        const data = await response.json();
        const resultText = data.choices[0].message.content;
        
        res.json({ result: resultText });

    } catch (error) {
        console.error("❌ OpenAI API Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// JALANKAN SERVER
// ==========================================
app.listen(port, () => {
    console.log(`===========================================`);
    console.log(`🚀 SERVER BACKEND BERJALAN DENGAN AMAN!`);
    console.log(`👉 Endpoint: http://localhost:${port}`);
    console.log(`===========================================`);
});