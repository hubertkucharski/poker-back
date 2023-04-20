import { Inject, Injectable } from '@nestjs/common';
import { Game } from 'holdem-poker';
import { GameStateService } from '../game-state/game-state.service';

const INITIAL_BET = 10;
const DEFAULT_PLAYER_MONEY = 100;
const PLAYER_CONFIG = [DEFAULT_PLAYER_MONEY, DEFAULT_PLAYER_MONEY];
export const ALL_PLAYERS_MAKE_DECISION = -1;
export const NO_WINNER = -1;
export const END_GAME = -2;

@Injectable()
export class CycleManagerService {
  constructor(
    @Inject(GameStateService) private gameStateService: GameStateService,
  ) {}
  game: any = new Game(PLAYER_CONFIG, INITIAL_BET);

  async startRound(roomId) {
    const playersInRoom = await this.getPlayersInRoom(roomId);
    if (playersInRoom.length <= 1) {
      console.log('Wait for at least one more player.');
      return [];
    }
    this.game.newRound(
      playersInRoom.map((player) => player.balance),
      INITIAL_BET,
    );
    this.game.startRound();

    return this.game.getState().players.map((hands) => hands.hand);
  }

  async check(clientId, roomId) {
    const playerIndex = await this.gameStateService.getPlayerIndex(
      clientId,
      roomId,
    );
  }

  fold(clientId, roomId) {}

  async call(clientId, roomId) {
    const playerIndex = await this.gameStateService.getPlayerIndex(
      clientId,
      roomId,
    );
    this.game.call(playerIndex);
    const nextActivePlayer = this.nextPlayer();
    if (nextActivePlayer === ALL_PLAYERS_MAKE_DECISION) {
      try {
        this.game.endRound();
        this.game.startRound();
        return ALL_PLAYERS_MAKE_DECISION;
      } catch {
        return END_GAME;
      }
    } else
      return this.gameStateService.setActivePlayer(nextActivePlayer, roomId);
  }

  availableAction(playerIndex: number) {
    return this.game.getState().players[playerIndex].availableActions;
  }

  async getPlayerCards(clientId, roomId) {
    const indexBe = await this.gameStateService.getPlayerIndex(
      clientId,
      roomId,
    );
    return this.game.getState().players[indexBe].hand;
  }

  async getPlayersInRoom(roomId: string) {
    return (await this.gameStateService.findPlayersInRoom(roomId)).players;
  }

  nextPlayer() {
    const players = this.game.getState().players;
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (!player.folded && player.currentDecision === '') {
        return i;
      }
    }
    return -1;
  }

  async playerWon(roomId): Promise<number> {
    const winnerIndex = this.game.checkResult().index;
    const playersInRoom = await this.getPlayersInRoom(roomId);
    console.log(await playersInRoom[winnerIndex].playerIndex);
    return 0;
  }
}
