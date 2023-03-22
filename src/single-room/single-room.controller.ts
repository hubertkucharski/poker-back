import { Controller, Get, Post, Param, Delete, Inject } from "@nestjs/common";
import { SingleRoomService } from "./single-room.service";

@Controller("single-room")
export class SingleRoomController {
  constructor(
    @Inject(SingleRoomService) private singleRoomService: SingleRoomService,
    ) {}

  @Post("/:id")
  async create(@Param("id") id: string) {
    return this.singleRoomService.create(id);
  }

  @Get("/")
  async findAll() {
    return this.singleRoomService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.singleRoomService.findOne(+id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.singleRoomService.remove(+id);
  }
}
