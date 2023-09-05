import { Injectable } from '@nestjs/common';
import { config } from '../../config/config';
import { OpenAI } from 'openai';

@Injectable()
export class PlayerAiService {
  private readonly apiKey: string;
  private readonly openai: OpenAI;

  constructor() {
    this.apiKey = config.openaiApiKey;

    this.openai = new OpenAI({
      apiKey: this.apiKey,
    });
  }
  async getAiAnswer(question: string): Promise<string> {
    try {
      const parameters1 = {
        model: 'gpt-3.5-turbo',
        max_tokens: 30,

        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: question,
          },
        ],
      };
      const completion: OpenAI.Chat.Completions.ChatCompletion =
        await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          max_tokens: 30,

          messages: [
            {
              role: 'system',
              content: config.aiContent,
            },
            { role: 'user', content: question },
          ],
        });
      return completion.choices[0].message.content;
    } catch (e) {
      console.log(e);
    }
  }
}
