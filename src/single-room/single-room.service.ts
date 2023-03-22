import { Injectable } from '@nestjs/common';
import { SingleRoom } from "./singleRoom.entity";

@Injectable()
export class SingleRoomService {
  async create(id: string) {
    await SingleRoom.save({roomName: id});
    return {message: "success", statusCode: 200};
  }

  async findAll(): Promise<SingleRoom[]> {
    return await SingleRoom.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} singleRoom`;
  }

  remove(id: number) {
    return `This action removes a #${id} singleRoom`;
  }
}
