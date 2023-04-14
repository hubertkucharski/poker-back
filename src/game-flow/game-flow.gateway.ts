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

export interface Client {
  clientId: string;
  playerBalance: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameFlowGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly gameFlowService: GameFlowService) {}

  handleConnection(client: Socket) {
    const playerIndexOnTable = this.gameFlowService.playerJoin(client.id);
    client.emit('joinGame', playerIndexOnTable);
  }

  @SubscribeMessage('createGameFlow')
  async create(
    @MessageBody() createGameFlowDto: CreateGameFlowDto,
    @ConnectedSocket() client: Socket,
  ) {
    const { roomId } = createGameFlowDto;
    client.join(roomId);

    const playersHands = this.gameFlowService.create(
      createGameFlowDto,
      client.id,
    );
    this.server.emit('initRound', playersHands);
  }

  handleDisconnect(client: Socket) {
    this.gameFlowService.playerLeave(client.id);
  }

  @SubscribeMessage('endRound')
  endRound() {
    const commonCards = this.gameFlowService.endRound();
    this.server.emit('endRound', commonCards);
  }
}
