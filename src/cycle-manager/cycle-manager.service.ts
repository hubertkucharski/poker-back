import { Inject, Injectable } from '@nestjs/common';
import { Card, Game } from 'holdem-poker';
import { GameStateService } from '../game-state/game-state.service';
import { currentDecision } from '../players/players.entity';

const INITIAL_BET = 0;
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

  async nextRound(roomId) {
    const playersInRoom = await this.getPlayersInRoom(roomId);
    playersInRoom.map((player) => {
      if (
        player.currentDecision !== currentDecision.NOT_PLAYING &&
        player.currentDecision !== currentDecision.FOLD
      ) {
        player.currentDecision = currentDecision.NOT_DECIDED;
        player.save();
      }
    });
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
        player.currentDecision = currentDecision.NOT_DECIDED;
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

  async fold(clientId, roomId) {
    const playerIndexInGame = await this.gameStateService.getPlayerIndexInGame(
      clientId,
      roomId,
    );
    this.game.fold(playerIndexInGame);
    await this.gameStateService.setCurrentDecision(
      clientId,
      roomId,
      currentDecision.FOLD,
    );
    if (this.isAllPlayersFolded()) return END_GAME;

    return await this.nextActivePlayer(roomId);
  }

  async call(clientId, roomId) {
    const playerIndexInGame = await this.gameStateService.getPlayerIndexInGame(
      clientId,
      roomId,
    );
    this.game.call(playerIndexInGame);
    await this.gameStateService.setCurrentDecision(
      clientId,
      roomId,
      currentDecision.CALL,
    );
    return this.nextActivePlayer(roomId);
  }

  async raise(clientId, roomId, value) {
    const playerIndexInGame = await this.removePreviousPlayersActionIfNotFolded(
      clientId,
      roomId,
    );
    this.game.raise(playerIndexInGame, value);

    return await this.nextActivePlayer(roomId);
  }

  availableAction(playerIndex: number) {
    return this.getPlayersFromGameState()[playerIndex].availableActions;
  }

  async getPlayerCards(indexInGame) {
    return this.getPlayersFromGameState()[indexInGame].hand;
  }

  async getPlayersInRoom(roomId: string) {
    return (await this.gameStateService.findPlayersInRoom(roomId)).players;
  }
  async getPlayersIndexAndBalance(roomId: string) {
    return await this.gameStateService.getPlayersIndexAndBalance(roomId);
  }

  async nextActivePlayer(roomId: string) {
    const nextActivePlayer = await this.nextPlayer(roomId);

    if (nextActivePlayer !== ALL_PLAYERS_MAKE_DECISION) {
      return this.gameStateService.setActivePlayer(nextActivePlayer, roomId);
    }
    if (this.game.getState().communityCards.length === 5) {
      return END_GAME;
    }
    await this.nextRound(roomId);
    return ALL_PLAYERS_MAKE_DECISION;
  }

  getPlayersFromGameState() {
    return this.game.getState().players;
  }

  lastNotFoldedPlayerIndex() {
    return this.getPlayersFromGameState().findIndex((player) => !player.folded);
  }

  isAllPlayersFolded() {
    return (
      this.lastNotFoldedPlayerIndex() !== -1 &&
      this.getPlayersFromGameState().filter((player) => !player.folded)
        .length === 1
    );
  }
  async removePreviousPlayersActionIfNotFolded(clientId, roomId) {
    const players = await this.getPlayersInRoom(roomId);
    for (let i = 0; i < players.length; i++) {
      const player = players[i];

      if (
        player.currentDecision !== currentDecision.FOLD &&
        player.currentDecision !== currentDecision.NOT_PLAYING
      ) {
        await this.gameStateService.setCurrentDecision(
          player.clientId,
          roomId,
          currentDecision.NOT_DECIDED,
        );
      }
      if (player.clientId === clientId) {
        await this.gameStateService.setCurrentDecision(
          clientId,
          roomId,
          currentDecision.RAISE,
        );
      }
    }
    const round = this.game.round;
    for (let i = 0; i < round.length; i++) {
      let player = round[i];
      if (player.decision !== 'raise' && player.decision !== 'fold')
        player.decision = '';
    }
    return this.gameStateService.getPlayerIndexInGame(clientId, roomId);
  }

  async nextPlayer(roomId: string) {
    const players = await this.getPlayersInRoom(roomId);
    for (let i = 0; i < players.length; i++) {
      const player = players[i];

      if (player.currentDecision === currentDecision.NOT_DECIDED) {
        return player.playerIndex;
      }
    }
    return ALL_PLAYERS_MAKE_DECISION;
  }

  async gameResult(roomId): Promise<{
    playerIndex: number;
    winningHand: string;
    finalCommonCards: Card[];
    pot: number;
    activePlayer: number;
    players: Card[];
  }> {
    await this.gameStateService.setActivePlayer(
      ALL_PLAYERS_MAKE_DECISION,
      roomId,
    );
    const finalCommonCards = this.game.getState().communityCards;
    const players = this.game.getState().players;
    const pot = this.game.getState().pot;
    const isAllPlayersFolded = this.isAllPlayersFolded();
    const checkResult = isAllPlayersFolded
      ? { index: this.lastNotFoldedPlayerIndex(), name: '' }
      : this.game.checkResult();

    return {
      playerIndex: await this.getPlayerIndexAtTable(checkResult.index, roomId),
      winningHand: checkResult.name,
      finalCommonCards: finalCommonCards,
      pot: pot,
      activePlayer: END_GAME,
      players: players,
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
