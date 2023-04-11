import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SingleRoomModule } from './single-room/single-room.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TYPEORM_CONFIG } from '../config/typeOrm.config';
import { GameFlowModule } from './game-flow/game-flow.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(TYPEORM_CONFIG),
    SingleRoomModule,
    GameFlowModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
