import { forwardRef, Module } from '@nestjs/common';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { GameFlowModule } from '../game-flow/game-flow.module';

@Module({
  imports: [forwardRef(() => GameFlowModule)],
  controllers: [PlayersController],
  providers: [PlayersService],
  exports: [PlayersService],
})
export class PlayersModule {}
