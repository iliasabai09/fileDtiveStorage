import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN!;
  private readonly chatId = process.env.TELEGRAM_CHAT_ID!;

  async sendMessage(text: string): Promise<void> {
    try {
      await axios.post(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
        },
      );
    } catch (err) {
      this.logger.error('Telegram notify failed', err);
    }
  }
}
