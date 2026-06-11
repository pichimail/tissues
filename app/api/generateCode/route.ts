import { getCodingPrompt } from '@/lib/prompt';

import Together from 'together-ai';
import { z } from 'zod';

let options: ConstructorParameters<typeof Together>[0] = {};

if (process.env.HELICONE_API_KEY) {
  options.baseURL = 'https://together.helicone.ai/v1';
  options.defaultHeaders = {
    'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
  };
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const result = z
      .object({
        model: z.string(),
        imageUrl: z.string(),
        shadcn: z.boolean().default(false),
      })
      .safeParse(json);

    if (result.error) {
      return new Response(result.error.message, { status: 422 });
    }

    const { model, imageUrl, shadcn } = result.data;
    const codingPrompt = getCodingPrompt(shadcn);

    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) {
      console.error('Missing TOGETHER_API_KEY');
      return new Response(
        JSON.stringify({
          error:
            'TOGETHER_API_KEY environment variable is not set. Add it in your Vercel project settings (or .env.local).',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Instantiate inside the handler (lazy) so the key is only needed at runtime.
    const together = new Together({ ...options, apiKey });

    const togetherRes = await (together.chat.completions.create as any)({
      model,
      temperature: 0.2,
      max_tokens: 65536,
      stream: true,
      reasoning: { enabled: false },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: codingPrompt },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    });

    let sentThinking = false;
    let sentDoneThinking = false;

    const textStream = togetherRes
      .toReadableStream()
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            if (!chunk) return;
            try {
              const parsed = JSON.parse(chunk);
              const choice = parsed.choices?.[0];
              if (!choice) return;

              if (choice.finish_reason) {
                console.log('Stream finished:', choice.finish_reason);
              }

              const reasoning = choice.delta?.reasoning_content || choice.delta?.reasoning;
              if (reasoning) {
                if (!sentThinking) {
                  sentThinking = true;
                  controller.enqueue('__THINKING__');
                }
                controller.enqueue('__REASON__' + reasoning);
                return;
              }

              const text = choice.delta?.content || choice.text;
              if (text) {
                if (sentThinking && !sentDoneThinking) {
                  sentDoneThinking = true;
                  controller.enqueue('__DONE_THINKING__');
                }
                controller.enqueue(text);
              }
            } catch (err) {
              console.error('Stream chunk parse error:', err);
            }
          },
        })
      )
      .pipeThrough(new TextEncoderStream());

    return new Response(textStream, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  } catch (error: any) {
    console.error('Error in /api/generateCode:', error);
    const message = error?.message || 'Internal server error while generating code';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const runtime = 'edge';
