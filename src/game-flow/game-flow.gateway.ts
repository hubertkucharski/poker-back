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

  async emitCurrentState() {
    const { communityCards, pot } = this.cycleManagerService.game.getState();
    const currentState = {
      commonCards: communityCards,
      pot: pot,
      checkResult: '',
      playerWon: NO_WINNER,
      activePlayer: await this.cycleManagerService.getActivePlayer(
        DEFAULT_ROOM_ID,
      ),
    };
    this.server.emit('currentState', currentState);
  }

  async emitCheckResult() {
    const { finalCommonCards, pot, playerIndex, winningHand } =
      await this.cycleManagerService.gameResult(DEFAULT_ROOM_ID);

    const finalResult = {
      commonCards: finalCommonCards,
      pot: pot,
      playerWon: playerIndex,
      checkResult: winningHand,
    };
    this.server.emit('currentState', finalResult);
  }

  async handleConnection(client: Socket) {
    await this.emitCurrentState();
    const playerIndexOnTable = await this.gameFlowService.playerJoin(
      client.id,
      DEFAULT_ROOM_ID,
    );
    client.emit('joinGame', playerIndexOnTable);
  }

  @SubscribeMessage('createGameFlow')
  async create(@ConnectedSocket() client: Socket) {
    await this.emitCurrentState();
    client.join(DEFAULT_ROOM_ID);

    const allPlayers = await this.cycleManagerService.startRound(
      DEFAULT_ROOM_ID,
    );

    if (allPlayers.length <= 1) {
      client.emit('initRound', ['', '']);
      return;
    }
    for (const player of allPlayers) {
      const playerHand = await this.cycleManagerService.getPlayerCards(
        player.playerIndexInGame,
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
    await this.cycleManagerService.check(client.id, DEFAULT_ROOM_ID);
    this.server.emit('check', 'check - OK');
  }

  @SubscribeMessage('call')
  async call(@ConnectedSocket() client: Socket) {
    const newGameState = this.cycleManagerService.call(
      client.id,
      DEFAULT_ROOM_ID,
    );

    if ((await newGameState) === END_GAME) {
      await this.emitCheckResult();
      return;
    }
    await this.emitCurrentState();
    this.server.emit('call', newGameState);
  }
}
