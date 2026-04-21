const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Melayani file dari folder 'public' (index.html dan admin.html)
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', async (req, res) => {
    const { prompt, system, engine } = req.body;
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    try {
        if (engine === 'openai') {
            if (!openaiKey) throw new Error('API Key OpenAI belum diatur di Render.');
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: system }, 
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8
                })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'OpenAI Error');
            res.json({ text: data.choices[0].message.content });

        } else {
            if (!geminiKey) throw new Error('API Key Gemini belum diatur di Render.');
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ parts: [{ text: `${system}\n\n${prompt}` }] }],
                    generationConfig: { temperature: 0.8 }
                })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Gemini Error');
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('AI tidak memberikan respon. Silakan coba topik lain.');
            }
            
            res.json({ text: data.candidates[0].content.parts[0].text });
        }
    } catch (error) {
        console.error("Backend Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server aktif di port ${PORT}`);
});
