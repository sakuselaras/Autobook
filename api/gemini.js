export default async function handler(req, res) {
    // 1. Memastikan hanya menerima metode POST dari web utama
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Hanya menerima metode POST' });
    }

    const { prompt, system } = req.body;
    
    // 2. Mengambil API Key dari Environment Variables Vercel
    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
        return res.status(500).json({ error: 'API Key belum diatur di dashboard Vercel.' });
    }

    // 3. Menyederhanakan prompt agar didukung oleh semua versi Gemini gratis
    const combinedPrompt = `Peran Anda: ${system}\n\nPENTING: Balas HANYA dengan format JSON yang valid berisi properti "title". Jangan tambahkan teks lain. Contoh balasan: {"title": "Judul Buku yang Menarik"}\n\nTopik buku: ${prompt}`;

    const payload = { 
        contents: [{ parts: [{ text: combinedPrompt }] }]
    };

    try {
        // SOLUSI PASTI: Menggunakan model "gemini-pro" yang didukung penuh di semua server
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        // Menangkap error jika ada kendala
        if (data.error) {
            return res.status(400).json({ error: data.error.message });
        }

        // Membersihkan balasan AI agar format JSON-nya rapi
        const resultText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        res.status(200).json(JSON.parse(resultText));

    } catch (error) {
        res.status(500).json({ error: 'Gagal menghubungi server Google Gemini. Cek pengaturan Region Vercel Anda.' });
    }
}
