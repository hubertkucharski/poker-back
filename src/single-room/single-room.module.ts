import { Module } from '@nestjs/common';
import { SingleRoomService } from './single-room.service';
import { SingleRoomController } from './single-room.controller';
import { SingleRoom } from './singleRoom.entity';

@Module({
  imports: [SingleRoom],
  controllers: [SingleRoomController],
  providers: [SingleRoomService],
})
export class SingleRoomModule {}
