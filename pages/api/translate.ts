import { OpenAI } from 'openai';
import { MAX_COUNT } from '@/utils/constants';
import { NextApiRequest, NextApiResponse } from 'next';
import buildMessages from '@/helpers/buildMessages';

const TOKEN_FACTOR = 4;
const MAX_TOKENS = MAX_COUNT / TOKEN_FACTOR * 3;
const GPT_MODEL = 'gpt-3.5-turbo';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const cache = new Map<string, string>();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const { text } = req.body;

    if(req.method === 'POST') {
        const cachedTranslations = cache.get(text);
        if (cachedTranslations) {
            return res.status(200).json({ translatedText: cachedTranslations });
        };

        try {
            const response = await openai.chat.completions.create({
                model: GPT_MODEL,
                messages: buildMessages(text),
                temperature: 0,
                max_tokens: MAX_TOKENS,
            });

            const translatedText = response.choices?.[0]?.message?.content?.trim() ?? "";

            cache.set(text, translatedText);

            res.status(200).json({ translatedText });
        } catch (error) {
            if ( error instanceof OpenAI.APIError) {
                console.error('Error:', `
                status: ${error.status}
                code: ${error.code},
                message: ${error.message},
                type: ${error.type}`);
                res.status(500).json({ message: "Something went wrong with the OpenAI request"})
            } else {
                console.error(error);
                res.status(500).json({ message: "Something went wrong with the translation"})
            }
        }
    } else {
        res.setHeader("Allow", ["POST"]);
        res.status(405).json({ messsage: `Method ${req.method} not allowed`})
    }
}

export default handler;