export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt, system, schema, engine } = req.body;
    
    // Mengambil kedua API Key dari Vercel
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    try {
        // --- JIKA PENGGUNA MENGGUNAKAN KREDIT PRO (OPENAI) ---
        if (engine === 'openai') {
            if (!openaiKey) return res.status(400).json({ error: 'OPENAI_API_KEY belum disetting di Vercel.' });

            // Menggabungkan instruksi schema agar ChatGPT paham struktur JSON yang diminta
            const openaiSystem = schema 
                ? system + "\n\nPENTING: Anda WAJIB mengembalikan HANYA format JSON murni. Format JSON harus mengikuti skema berikut ini:\n" + JSON.stringify(schema)
                : system + "\n\nPENTING: Kembalikan HANYA format JSON murni.";

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini', // Model standar yang cerdas & cepat
                    messages: [
                        { role: 'system', content: openaiSystem },
                        { role: 'user', content: prompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.8
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            
            // Parse dan kembalikan JSON yang sudah jadi
            const resultText = data.choices[0].message.content.replace(/```json|```/g, '').trim();
            return res.status(200).json(JSON.parse(resultText));

        } 
        // --- JIKA PENGGUNA MENGGUNAKAN KREDIT GRATIS (GEMINI) ---
        else {
            if (!geminiKey) return res.status(400).json({ error: 'GEMINI_API_KEY belum disetting di Vercel.' });
            
            const payload = { 
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: system }] },
                generationConfig: { 
                    responseMimeType: "application/json", 
                    temperature: 0.8 
                }
            };

            // Masukkan schema khusus Gemini
            if (schema) {
                payload.generationConfig.responseSchema = schema;
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            // Parse dan kembalikan JSON yang sudah jadi
            const resultText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            return res.status(200).json(JSON.parse(resultText));
        }

    } catch (error) {
        return res.status(500).json({ error: `Gagal memproses AI: ${error.message}` });
    }
}
