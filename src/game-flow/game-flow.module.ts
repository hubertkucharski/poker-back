import { forwardRef, Module } from '@nestjs/common';
import { GameFlowService } from './game-flow.service';
import { GameFlowGateway } from './game-flow.gateway';
import { GameStateModule } from '../game-state/game-state.module';
import { PlayersModule } from '../players/players.module';

@Module({
  imports: [forwardRef(() => GameStateModule), forwardRef(() => PlayersModule)],
  providers: [GameFlowGateway, GameFlowService],
  exports: [GameFlowService],
})
export class GameFlowModule {}
