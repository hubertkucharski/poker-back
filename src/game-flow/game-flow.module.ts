import { Module } from '@nestjs/common';
import { GameFlowService } from './game-flow.service';
import { GameFlowGateway } from './game-flow.gateway';

@Module({
  providers: [GameFlowGateway, GameFlowService]
})
export class GameFlowModule {}
