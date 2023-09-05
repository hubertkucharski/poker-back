import { Module } from '@nestjs/common';
import { CycleManagerService } from './cycle-manager.service';
import { GameStateModule } from '../game-state/game-state.module';
import { PlayerAiModule } from '../player-ai/player-ai.module';

@Module({
  imports: [GameStateModule, PlayerAiModule],
  providers: [CycleManagerService],
  exports: [CycleManagerService],
})
export class CycleManagerModule {}
