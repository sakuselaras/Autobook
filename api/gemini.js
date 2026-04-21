// SANGAT PENTING: Memaksa Vercel menunggu AI sampai selesai (Maks 60 detik)
// Tanpa baris ini, Vercel akan memutus koneksi di detik ke-10 dan menyebabkan error.
export const maxDuration = 60;

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
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Gagal terhubung ke OpenAI');
            
            return res.status(200).json({ text: data.choices[0].message.content });

        } 
        // --- JIKA PENGGUNA MENGGUNAKAN KREDIT GRATIS (GEMINI) ---
        else {
            if (!geminiKey) return res.status(400).json({ error: 'GEMINI_API_KEY belum disetting di Vercel.' });
            
            const combinedPrompt = `INSTRUKSI:\n${system}\n\nPERINTAH BUKU:\n${prompt}`;

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

            if (!data.candidates || data.candidates.length === 0) {
                 throw new Error('Gemini memblokir respons ini karena alasan keamanan konten.');
            }

            return res.status(200).json({ text: data.candidates[0].content.parts[0].text });
        }

    } catch (error) {
        return res.status(500).json({ error: `${error.message}` });
    }
}
