import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagesModule } from './messages/messages.module';
import { SingleRoomModule } from './single-room/single-room.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TYPEORM_CONFIG } from '../config/typeOrm.config';
import { DeckModule } from './deck/deck.module';
import { GameFlowModule } from './game-flow/game-flow.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(TYPEORM_CONFIG),
    MessagesModule,
    SingleRoomModule,
    DeckModule,
    GameFlowModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
