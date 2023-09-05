import { Module } from '@nestjs/common';
import { PlayerAiController } from './player-ai.controller';
import { PlayerAiService } from './player-ai.service';

@Module({
  controllers: [PlayerAiController],
  providers: [PlayerAiService],
  exports: [PlayerAiService],
})
export class PlayerAiModule {}
