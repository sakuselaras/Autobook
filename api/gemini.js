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
                    model: 'gpt-3.5-turbo', // Model standar yang stabil
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Gagal terhubung ke OpenAI');
            
            // Kembalikan teks format Markdown
            return res.status(200).json({ text: data.choices[0].message.content });

        } 
        // --- JIKA PENGGUNA MENGGUNAKAN KREDIT GRATIS (GEMINI) ---
        else {
            if (!geminiKey) return res.status(400).json({ error: 'GEMINI_API_KEY belum disetting di Vercel.' });
            
            // Menggabungkan instruksi agar 100% didukung semua model Gemini
            const combinedPrompt = `INSTRUKSI:\n${system}\n\nPERINTAH BUKU:\n${prompt}`;

            // Menggunakan parameter URL ?key= (Jauh lebih aman dan jarang diblokir)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: combinedPrompt }] }],
                    generationConfig: { 
                        temperature: 0.8 
                    }
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Gagal terhubung ke Gemini');

            // Cek jika AI tidak merespons (misal terblokir kata-kata sensitif)
            if (!data.candidates || data.candidates.length === 0) {
                 throw new Error('Gemini memblokir respons ini karena alasan keamanan konten.');
            }

            // Kembalikan teks format Markdown
            return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
        }

    } catch (error) {
        // Pesan error akan langsung dikirim ke layar pengguna
        return res.status(500).json({ error: `${error.message}` });
    }
}
