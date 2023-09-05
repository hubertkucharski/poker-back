import { Body, Controller, Post } from '@nestjs/common';
import { PlayerAiService } from './player-ai.service';
import { GetAiModelAnswer } from './model/get-ai-model-answer';

@Controller('player-ai')
export class PlayerAiController {
  constructor(private readonly playerAiService: PlayerAiService) {}

  @Post('/message')
  getModelAnswer(@Body() data: GetAiModelAnswer) {
    return this.playerAiService.getAiAnswer(data.question);
  }
}
