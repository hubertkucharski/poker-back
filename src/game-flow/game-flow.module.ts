import { Module } from '@nestjs/common';
import { GameFlowService } from './game-flow.service';
import { GameFlowGateway } from './game-flow.gateway';
import { GameStateModule } from '../game-state/game-state.module';
import { PlayersModule } from '../players/players.module';
import { CycleManagerModule } from '../cycle-manager/cycle-manager.module';

@Module({
  imports: [GameStateModule, CycleManagerModule, PlayersModule],
  providers: [GameFlowGateway, GameFlowService],
  exports: [GameFlowService],
})
export class GameFlowModule {}
