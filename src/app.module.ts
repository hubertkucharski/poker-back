import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SingleRoomModule } from './single-room/single-room.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TYPEORM_CONFIG } from '../config/typeOrm.config';
import { GameFlowModule } from './game-flow/game-flow.module';
import { CycleManagerModule } from './cycle-manager/cycle-manager.module';
import { GameStateModule } from './game-state/game-state.module';
import { PlayersModule } from './players/players.module';
import { PlayerAiModule } from './player-ai/player-ai.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(TYPEORM_CONFIG),
    SingleRoomModule,
    GameFlowModule,
    CycleManagerModule,
    GameStateModule,
    PlayersModule,
    PlayerAiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
