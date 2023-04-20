import { forwardRef, Module } from '@nestjs/common';
import { GameStateController } from './game-state.controller';
import { GameStateService } from './game-state.service';
import { GameFlowModule } from '../game-flow/game-flow.module';

@Module({
  imports: [forwardRef(() => GameFlowModule)],
  controllers: [GameStateController],
  providers: [GameStateService],
  exports: [GameStateService],
})
export class GameStateModule {}
