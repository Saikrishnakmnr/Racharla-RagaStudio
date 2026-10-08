export default async function handler(req, res) {
    // Enable complete CORS parameters
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
        const apiKey = req.headers['x-goog-api-key'] || req.headers['X-Goog-Api-Key'];
        if (!apiKey) {
            return res.status(400).json({ error: 'Missing Gemini API Key in request headers' });
        }

        const { currentLanguage, fullMusicPromptDescription } = req.body;

        // Correct production endpoint for Gemini 1.5 Flash
        const geminiUrl = `https://googleapis.com{apiKey}`;
        
        const lyricContextPrompt = `Write complete song lyrics natively in the ${currentLanguage} script based on this theme: "${fullMusicPromptDescription}". Include clear structural sections like [Intro], [Verse 1], [Chorus], [Verse 2], and [Outro]. Make it creative and highly musical.`;

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                contents: [{ parts: [{ text: lyricContextPrompt }] }] 
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error?.message || `Google API responded with status ${response.status}` 
            });
        }

        // Deep extraction structure to avoid undefined runtime syntax loops
        const textLyrics = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textLyrics) {
            return res.status(500).json({ error: 'Invalid response formatting structure returned by Google.' });
        }

        return res.status(200).json({ lyrics: textLyrics });
    } catch (error) {
        console.error("Vercel Server Exception:", error);
        return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
}
