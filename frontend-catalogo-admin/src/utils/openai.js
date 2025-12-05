import axios from 'axios';

// WARNING: It is not secure to store API keys in frontend code. 
// This should ideally be moved to a backend proxy or environment variable.
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '';

export const translateText = async (text, targetLanguages = ['en', 'fr', 'es', 'de']) => {
    if (!text) return {};

    try {
        const prompt = `Translate the following Italian text into English, French, Spanish, and German. Return ONLY a JSON object with keys: "en", "fr", "es", "de". Do not include any markdown formatting or explanations. Text: "${text}"`;

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful translation assistant. You output only valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                }
            }
        );

        const content = response.data.choices[0].message.content;
        try {
            // Remove any potential markdown code blocks if the model adds them
            const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanContent);
        } catch (e) {
            console.error('Error parsing OpenAI response:', e);
            console.error('Raw content:', content);
            return {};
        }
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        throw error;
    }
};
