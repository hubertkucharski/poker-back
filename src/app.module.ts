import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagesModule } from './messages/messages.module';
import { SingleRoomModule } from './single-room/single-room.module';
import { TypeOrmModule } from "@nestjs/typeorm";
import { TYPEORM_CONFIG } from "../config/typeOrm.config";

@Module({
  imports: [
    TypeOrmModule.forRoot(TYPEORM_CONFIG),
    MessagesModule,
    SingleRoomModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
