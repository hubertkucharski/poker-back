import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { GameFlowService } from './game-flow.service';
import { Server, Socket } from 'socket.io';
import {
  ALL_PLAYERS_MAKE_DECISION,
  CycleManagerService,
  END_GAME,
  NO_WINNER,
} from '../cycle-manager/cycle-manager.service';

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
  constructor(
    private readonly gameFlowService: GameFlowService,
    private readonly cycleManagerService: CycleManagerService,
  ) {}

  emitCurrentState() {
    const currentState = {
      commonCards: this.cycleManagerService.game.getState().communityCards,
      pot: this.cycleManagerService.game.getState().pot,
      checkResult: {},
      playerWon: NO_WINNER,
    };
    this.server.emit('currentState', currentState);
  }

  async emitCheckResult() {
    const finalResult = {
      commonCards: this.cycleManagerService.game.getState().communityCards,
      pot: this.cycleManagerService.game.getState().pot,
      playerWon: await this.cycleManagerService.playerWon(DEFAULT_ROOM_ID),
      checkResult: this.cycleManagerService.game.checkResult(),
    };
    this.server.emit('currentState', finalResult);
  }

  async handleConnection(client: Socket) {
    this.emitCurrentState();
    const playerIndexOnTable = await this.gameFlowService.playerJoin(
      client.id,
      DEFAULT_ROOM_ID,
    );
    client.emit('joinGame', playerIndexOnTable);
  }

  @SubscribeMessage('createGameFlow')
  async create(@ConnectedSocket() client: Socket) {
    client.join(DEFAULT_ROOM_ID);

    await this.gameFlowService.create(DEFAULT_ROOM_ID);

    const allPlayers = await this.cycleManagerService.getPlayersInRoom(
      DEFAULT_ROOM_ID,
    );

    if (allPlayers.length <= 1) {
      client.emit('initRound', ['', '']);
      return;
    }

    for (const player of allPlayers) {
      const playerHand = await this.cycleManagerService.getPlayerCards(
        player.clientId,
        DEFAULT_ROOM_ID,
      );
      this.server.to(player.clientId).emit('initRound', playerHand);
    }
  }

  async handleDisconnect(client: Socket) {
    await this.gameFlowService.playerLeave(client.id, DEFAULT_ROOM_ID);
    console.log('Server disconnected');
  }

  @SubscribeMessage('check')
  async check(@ConnectedSocket() client: Socket) {
    this.cycleManagerService.check(client.id, DEFAULT_ROOM_ID);
    this.server.emit('check', 'check - OK');
  }

  @SubscribeMessage('call')
  async call(@ConnectedSocket() client: Socket) {
    const newGameState = this.cycleManagerService.call(
      client.id,
      DEFAULT_ROOM_ID,
    );
    console.log(await newGameState, 'newGameState game flow gateway');
    if ((await newGameState) === ALL_PLAYERS_MAKE_DECISION) {
      this.emitCurrentState();
    }
    if ((await newGameState) === END_GAME) {
      this.emitCheckResult();
    } else {
      this.emitCurrentState();
      this.server.emit('call', newGameState);
    }
  }
}
