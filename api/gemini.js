export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, system, engine } = req.body;
    
    // Mengambil kedua API Key dari Vercel
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    try {
        // --- JIKA PENGGUNA MENGGUNAKAN KREDIT PRO (OPENAI) ---
        if (engine === 'openai') {
            if (!openaiKey) return res.status(400).json({ error: 'OPENAI_API_KEY belum disetting di Vercel.' });

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Model standar yang cerdas & cepat
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            // Kembalikan teks format Markdown
            return res.status(200).json({ text: data.choices[0].message.content });

        } 
        // --- JIKA PENGGUNA MENGGUNAKAN KREDIT GRATIS (GEMINI) ---
        else {
            if (!geminiKey) return res.status(400).json({ error: 'GEMINI_API_KEY belum disetting di Vercel.' });
            
            // Menggunakan pengamanan Header (x-goog-api-key) untuk menghindari error blokir
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: system }] },
                    generationConfig: { 
                        temperature: 0.8 
                    }
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            // Kembalikan teks format Markdown
            return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
        }

    } catch (error) {
        return res.status(500).json({ error: `Gagal memproses AI: ${error.message}` });
    }
}
