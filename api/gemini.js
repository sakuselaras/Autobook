export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Hanya menerima method POST' });
    }

    const { prompt, system, schema } = req.body;
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key belum disetting di Vercel.' });
    }

    const payload = { 
        contents: [{ parts: [{ text: prompt }] }], 
        systemInstruction: { parts: [{ text: system }] }, 
        generationConfig: { 
            responseMimeType: "application/json", 
            responseSchema: schema, 
            temperature: 0.9 
        } 
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        const resultText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        res.status(200).json(JSON.parse(resultText));

    } catch (error) {
        res.status(500).json({ error: 'Gagal menghubungi server Google Gemini.' });
    }
}
