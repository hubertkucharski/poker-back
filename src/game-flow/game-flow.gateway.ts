import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { GameFlowService } from './game-flow.service';
import { Server, Socket } from 'socket.io';
import {
  ALL_PLAYERS_MAKE_DECISION,
  CycleManagerService,
  END_GAME,
  NO_WINNER,
} from '../cycle-manager/cycle-manager.service';
import { GameState } from '../game-state/game-state.entity';

export const DEFAULT_ROOM_ID = '953bed85-690a-43bd-825a-b94e9ed4c722';

const EMPTY_HAND = '';

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
      indexAndBalance: await this.cycleManagerService.getPlayersIndexAndBalance(
        DEFAULT_ROOM_ID,
      ),
      players: [],
    };

    this.server.emit('currentState', currentState);
  }

  async emitCheckResult() {
    const {
      finalCommonCards,
      pot,
      playerIndex,
      winningHand,
      activePlayer,
      players,
    } = await this.cycleManagerService.gameResult(DEFAULT_ROOM_ID);

    const finalResult = {
      commonCards: finalCommonCards,
      pot: pot,
      playerWon: playerIndex,
      checkResult: winningHand,
      activePlayer: activePlayer,
      indexAndBalance: await this.cycleManagerService.getPlayersIndexAndBalance(
        DEFAULT_ROOM_ID,
      ),
      players: players,
    };
    this.server.emit('currentState', finalResult);
  }

  async handleConnection(client: Socket) {
    const playerIndexAtTableAndBalance = await this.gameFlowService.playerJoin(
      client.id,
      DEFAULT_ROOM_ID,
    );
    await this.emitCurrentState();
    client.emit('joinGame', playerIndexAtTableAndBalance);
  }

  @SubscribeMessage('createGameFlow')
  async create(@ConnectedSocket() client: Socket) {
    client.join(DEFAULT_ROOM_ID);

    const allPlayers = await this.cycleManagerService.startRound(
      DEFAULT_ROOM_ID,
    );

    if (allPlayers.length <= 1) {
      client.emit('initRound', EMPTY_HAND);
      return;
    }
    for (const player of allPlayers) {
      const playerHand = await this.cycleManagerService.getPlayerCards(
        player.playerIndexInGame,
      );
      await this.emitCurrentState();

      this.server.to(player.clientId).emit('initRound', {
        playerIndex: player.playerIndex,
        playerHand: playerHand,
      });
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

  @SubscribeMessage('fold')
  async fold(@ConnectedSocket() client: Socket) {
    const newGameState = await this.cycleManagerService.fold(
      client.id,
      DEFAULT_ROOM_ID,
    );
    if (newGameState === END_GAME) {
      await this.emitCheckResult();
      return;
    }
    await this.emitCurrentState();
    this.server.emit('fold', newGameState);
  }

  @SubscribeMessage('raise')
  async raise(@ConnectedSocket() client: Socket, @MessageBody() value: number) {
    const newGameState = await this.cycleManagerService.raise(
      client.id,
      DEFAULT_ROOM_ID,
      value,
    );
    try {
      if (newGameState instanceof GameState) {
        await this.emitCurrentState();
        this.server.emit('call', newGameState);
      }
    } catch {
      console.error('Error in raise gateway.');
    }
  }
}
