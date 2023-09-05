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

const AI_PLAYER_CLIENT_ID = 'ai-clientId';
const EMPTY_HAND = '';
export let ai_hand = EMPTY_HAND;
export const DEFAULT_AI_POSITION = 3;
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
    const { communityCards } = this.cycleManagerService.game.getState();
    const pot = await this.cycleManagerService.getPot(DEFAULT_ROOM_ID);
    const currentMaxBet = await this.cycleManagerService.getCurrentMaxBet(
      DEFAULT_ROOM_ID,
    );
    const activePlayer = await this.cycleManagerService.getActivePlayer(
      DEFAULT_ROOM_ID,
    );
    const players = await this.cycleManagerService.getPlayersIndexAndBalance(
      DEFAULT_ROOM_ID,
    );

    const currentState = {
      commonCards: communityCards,
      pot: pot,
      currentMaxBet: currentMaxBet,
      checkResult: 0,
      playerWon: NO_WINNER,
      activePlayer: activePlayer,
      players: players,
    };

    this.server.emit('currentState', currentState);
  }

  async emitCheckResult() {
    const pot = await this.cycleManagerService.getPot(DEFAULT_ROOM_ID);
    const { communityCards } = this.cycleManagerService.getGameState();
    const finalPlayers = await this.cycleManagerService.getFinalResults(
      DEFAULT_ROOM_ID,
      pot,
    );

    const finalResult = {
      commonCards: communityCards,
      pot: pot,
      currentMaxBet: 0,
      playerWon: finalPlayers[0].playerWins,
      checkResult: finalPlayers[0].winningHand,
      activePlayer: END_GAME,
      players: finalPlayers,
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
      if (player.clientId === AI_PLAYER_CLIENT_ID) {
        ai_hand = JSON.stringify(playerHand);
      } else {
        await this.emitCurrentState();

        this.server.to(player.clientId).emit('initRound', {
          playerIndex: player.playerIndex,
          playerHand: playerHand,
        });
      }
    }
    if (
      (await this.cycleManagerService.getActivePlayer(DEFAULT_ROOM_ID)) ===
      DEFAULT_AI_POSITION
    ) {
      await this.cycleManagerService.aiAnswer();
      await this.emitCurrentState();
    }
  }

  async handleDisconnect(client: Socket) {
    if (
      await this.cycleManagerService.ifPlayerInGame(client.id, DEFAULT_ROOM_ID)
    ) {
      console.log('fold disconnect');

      if (await this.fold(client)) {
        await this.gameFlowService.playerLeave(client.id, DEFAULT_ROOM_ID);
      }
    } else {
      await this.gameFlowService.playerLeave(client.id, DEFAULT_ROOM_ID);
      console.log('Server disconnected');
    }
  }

  @SubscribeMessage('check')
  async check(@ConnectedSocket() client: Socket) {
    await this.cycleManagerService.check(client.id, DEFAULT_ROOM_ID);
    this.server.emit('check', 'check - OK');
  }

  @SubscribeMessage('call')
  async call(@ConnectedSocket() client: Socket) {
    const newGameState = await this.cycleManagerService.call(
      client.id,
      DEFAULT_ROOM_ID,
    );
    if (newGameState === END_GAME) {
      await this.emitCheckResult();
      return;
    }
    if (newGameState === ALL_PLAYERS_MAKE_DECISION) {
      await this.cycleManagerService.nextRound(DEFAULT_ROOM_ID);
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
      return newGameState;
    }
    if (newGameState === ALL_PLAYERS_MAKE_DECISION) {
      await this.cycleManagerService.nextRound(DEFAULT_ROOM_ID);
      await this.emitCurrentState();
    }
    await this.emitCurrentState();
    this.server.emit('fold', newGameState);
    return newGameState;
  }

  @SubscribeMessage('raise')
  async raise(@ConnectedSocket() client: Socket, @MessageBody() value: number) {
    const newGameState = await this.cycleManagerService.raise(
      client.id,
      DEFAULT_ROOM_ID,
      value,
    );
    await this.gameFlowService.changePlayerBalance(client.id, value);

    if (newGameState === ALL_PLAYERS_MAKE_DECISION) {
      await this.cycleManagerService.nextRound(DEFAULT_ROOM_ID);
      await this.emitCurrentState();
    }

    if (newGameState === END_GAME) {
      await this.emitCheckResult();
      return;
    }
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
