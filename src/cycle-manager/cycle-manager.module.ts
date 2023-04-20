import { Module } from '@nestjs/common';
import { CycleManagerService } from './cycle-manager.service';
import { GameStateModule } from '../game-state/game-state.module';

@Module({
  imports: [GameStateModule],
  providers: [CycleManagerService],
  exports: [CycleManagerService],
})
export class CycleManagerModule {}
