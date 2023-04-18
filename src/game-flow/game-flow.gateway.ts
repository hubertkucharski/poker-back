import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { GameFlowService } from './game-flow.service';
import { CreateGameFlowDto } from './dto/create-game-flow.dto';
import { Server, Socket } from 'socket.io';

export const DEFAULT_ROOM_ID = '953bed85-690a-43bd-825a-b94e9ed4c722';

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

  async handleConnection(client: Socket) {
    const getCommonCards = {
      commonCards: this.gameFlowService.game.getState().communityCards,
    };
    this.server.emit('currentState', getCommonCards);

    const playerIndexOnTable = await this.gameFlowService.playerJoin(
      client.id,
      DEFAULT_ROOM_ID,
    );

    client.emit('joinGame', playerIndexOnTable);
  }

  @SubscribeMessage('createGameFlow')
  async create(
    @MessageBody() createGameFlowDto: CreateGameFlowDto,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(DEFAULT_ROOM_ID);

    await this.gameFlowService.create(DEFAULT_ROOM_ID);

    const allPlayers = await this.gameFlowService.getPlayersInRoom(
      DEFAULT_ROOM_ID,
    );

    if (allPlayers.length > 1) {
      for (const player of allPlayers) {
        const playerHand = await this.gameFlowService.getPlayerCards(
          player.clientId,
          DEFAULT_ROOM_ID,
        );
        this.server.to(player.clientId).emit('initRound', playerHand);
      }
    } else client.emit('initRound', ['', '']);
  }

  async handleDisconnect(client: Socket) {
    await this.gameFlowService.playerLeave(client.id, DEFAULT_ROOM_ID);
    console.log('Server disconnected');
  }

  @SubscribeMessage('endRound')
  endRound() {
    const commonCards = this.gameFlowService.endRound();
    this.server.emit('endRound', commonCards);
  }
}
