import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { GameFlowService } from './game-flow.service';
import { CreateGameFlowDto } from './dto/create-game-flow.dto';
import { UpdateGameFlowDto } from './dto/update-game-flow.dto';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameFlowGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameFlowService: GameFlowService) {}

  @SubscribeMessage('createGameFlow')
  async create(
    @MessageBody() createGameFlowDto: CreateGameFlowDto,
    @ConnectedSocket() client: Socket,
  ) {
    const playersHands = this.gameFlowService.create(
      createGameFlowDto,
      client.id,
    );
    this.server.emit('initRound', playersHands);
  }

  @SubscribeMessage('findOneGameFlow')
  findOne(@MessageBody() id: number) {
    return this.gameFlowService.findOne(id);
  }

  @SubscribeMessage('flop')
  flop(@ConnectedSocket() client: Socket) {
    return this.gameFlowService.flop(client.id);
  }

  @SubscribeMessage('endRound')
  endRound() {
    const commonCards = this.gameFlowService.endRound();
    this.server.emit('endRound', commonCards);
    return 'End Round';
  }

  @SubscribeMessage('river')
  river() {
    return this.gameFlowService.river();
  }

  @SubscribeMessage('updateGameFlow')
  update(@MessageBody() updateGameFlowDto: UpdateGameFlowDto) {
    return this.gameFlowService.update(updateGameFlowDto.id, updateGameFlowDto);
  }

  @SubscribeMessage('removeGameFlow')
  remove(@MessageBody() id: number) {
    return this.gameFlowService.remove(id);
  }
}
