// Save this file as: api/generate.js
export default async function handler(req, res) {
    // Enable CORS so your frontend can talk to this backend server safely
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-goog-api-key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const apiKey = req.headers['x-goog-api-key'];
        if (!apiKey) {
            return res.status(400).json({ error: 'Missing Gemini API Key' });
        }

        const { currentLanguage, fullMusicPromptDescription } = req.body;

        const geminiUrl = `https://googleapis.com{apiKey}`;
        const lyricContextPrompt = `Write complete song lyrics natively in the ${currentLanguage} script based on this theme: "${fullMusicPromptDescription}". Include clear structural sections like [Intro], [Verse 1], [Chorus], [Verse 2], and [Outro]. Make it creative, artistic, and length appropriate.`;

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: lyricContextPrompt }] }] })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: errData.error?.message || 'Gemini API Error' });
        }

        const data = await response.json();
        const textLyrics = data.candidates?.[0]?.content?.parts?.[0]?.text || "No lyrics generated.";

        return res.status(200).json({ lyrics: textLyrics });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server Internal Error' });
    }
}
