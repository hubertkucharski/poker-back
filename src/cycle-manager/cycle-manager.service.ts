import { Inject, Injectable } from '@nestjs/common';
import { Card, Game } from 'holdem-poker';
import { GameStateService } from '../game-state/game-state.service';

const INITIAL_BET = 10;
const DEFAULT_PLAYER_MONEY = 0;
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

  nextRound() {
    this.game.endRound();
    this.game.startRound();
  }

  async startRound(roomId) {
    const playersInRoom = await this.getPlayersInRoom(roomId);
    if (playersInRoom.length <= 1) {
      console.log('Wait for at least one more player.');
      return [];
    }
    this.game.newRound(
      playersInRoom.map((player, index) => {
        player.playerIndexInGame = index;
        player.save();
        return player.balance;
      }),
      INITIAL_BET,
    );
    this.game.startRound();

    return playersInRoom;
  }

  async check(clientId, roomId) {
    const playerIndexInGame = await this.gameStateService.getPlayerIndexInGame(
      clientId,
      roomId,
    );
    this.game.check(playerIndexInGame);
  }

  fold(clientId, roomId) {}

  async call(clientId, roomId) {
    const playerIndexInGame = await this.gameStateService.getPlayerIndexInGame(
      clientId,
      roomId,
    );
    this.game.call(playerIndexInGame);
    const nextActivePlayer = await this.nextPlayer(roomId);

    if (nextActivePlayer !== ALL_PLAYERS_MAKE_DECISION) {
      return this.gameStateService.setActivePlayer(nextActivePlayer, roomId);
    }
    if (this.game.getState().communityCards.length === 5) {
      return END_GAME;
    }
    this.nextRound();
    return ALL_PLAYERS_MAKE_DECISION;
  }

  availableAction(playerIndex: number) {
    return this.game.getState().players[playerIndex].availableActions;
  }

  async getPlayerCards(indexInGame) {
    return this.game.getState().players[indexInGame].hand;
  }

  async getPlayersInRoom(roomId: string) {
    return (await this.gameStateService.findPlayersInRoom(roomId)).players;
  }

  async nextPlayer(roomId: string) {
    const players = this.game.getState().players;
    for (let i = 0; i < players.length; i++) {
      const player = players[i];

      if (!player.folded && player.currentDecision === '' && player.money > 0) {
        return this.getPlayerIndexAtTable(i, roomId);
      }
    }
    return ALL_PLAYERS_MAKE_DECISION;
  }

  async gameResult(roomId): Promise<{
    playerIndex: number;
    winningHand: string;
    finalCommonCards: Card[];
    pot: number;
  }> {
    const finalCommonCards = this.game.getState().communityCards;
    const pot = this.game.getState().pot;
    const checkResult = this.game.checkResult();

    return {
      playerIndex: await this.getPlayerIndexAtTable(checkResult.index, roomId),
      winningHand: checkResult.name,
      finalCommonCards: finalCommonCards,
      pot: pot,
    };
  }

  async getActivePlayer(roomId): Promise<number> {
    const oneState = await this.gameStateService.getOneState(roomId);
    return oneState.activePlayer;
  }

  async getPlayerIndexAtTable(indexInGame, roomId) {
    const playersInRoom = await this.getPlayersInRoom(roomId);
    const player = playersInRoom.find(
      (player) => player.playerIndexInGame === indexInGame,
    );
    return player.playerIndex;
  }
}
