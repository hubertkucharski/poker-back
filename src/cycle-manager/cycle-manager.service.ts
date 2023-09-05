import { Inject, Injectable } from '@nestjs/common';
import { Game } from 'holdem-poker';
import { GameStateService } from '../game-state/game-state.service';
import { currentDecision, Players } from '../players/players.entity';
import {
  ai_hand,
  DEFAULT_AI_POSITION,
  DEFAULT_ROOM_ID,
} from '../game-flow/game-flow.gateway';
import { PlayerAiService } from '../player-ai/player-ai.service';
import { GameState } from '../game-state/game-state.entity';

const INITIAL_BET = 0;
const DEFAULT_PLAYER_MONEY = 0;
const PLAYER_CONFIG = [DEFAULT_PLAYER_MONEY, DEFAULT_PLAYER_MONEY];
export const ALL_PLAYERS_MAKE_DECISION = -1;
export const NO_WINNER = -1;
export const END_GAME = -2;
const AI_PLAYER_CLIENT_ID = 'ai-clientId';

@Injectable()
export class CycleManagerService {
  constructor(
    @Inject(GameStateService) private gameStateService: GameStateService,
    @Inject(PlayerAiService) private playerAiService: PlayerAiService,
  ) {}
  game: any = new Game(PLAYER_CONFIG, INITIAL_BET);

  async nextRound(roomId: string) {
    const playersInRoom: Players[] = await this.getPlayersInRoom(roomId);
    playersInRoom.map((player: Players) => {
      if (
        player.currentDecision !== currentDecision.NOT_PLAYING &&
        player.currentDecision !== currentDecision.FOLD
      ) {
        player.currentDecision = currentDecision.NOT_DECIDED;
        player.currentBet = 0;
        player.save();
      }
    });
    await this.nextActivePlayer(roomId);
    await this.resetMaxRoundBet(roomId);
    console.log(playersInRoom, 'playersInRoom');
    this.game.endRound();
    this.game.startRound();
  }
  async nextRoundFirstPlayer(roomId: string) {
    const playersInRoom: Players[] = await this.getPlayersInRoom(roomId);
    const stillPlayingPlayer: Players = playersInRoom.find(
      (player: Players) =>
        player.currentDecision !== currentDecision.NOT_PLAYING &&
        player.currentDecision !== currentDecision.FOLD,
    );
    if (!stillPlayingPlayer) {
      await this.gameStateService.setActivePlayer(
        ALL_PLAYERS_MAKE_DECISION,
        roomId,
      );
    } else {
      const playerIndex: number = stillPlayingPlayer.playerIndex;
      await this.gameStateService.setActivePlayer(playerIndex, roomId);
    }
  }
  async startRound(roomId: string): Promise<Players[]> {
    const playersInRoom: Players[] = await this.getPlayersInRoom(roomId);
    await this.resetMaxRoundBet(roomId);
    await this.resetPot(roomId);
    if (playersInRoom.length <= 1) {
      console.log('Wait for at least one more player.');
      return [];
    }
    await this.gameStateService.setActivePlayer(
      playersInRoom.find((player: Players): boolean => player.playerIndex > -1)
        .playerIndex,
      roomId,
    );
    this.game.newRound(
      playersInRoom.map((player: Players, index: number) => {
        player.playerIndexInGame = index;
        player.currentDecision = currentDecision.NOT_DECIDED;
        player.currentBet = 0;
        player.save();
        return player.balance;
      }),
      INITIAL_BET,
    );
    this.game.startRound();

    return playersInRoom;
  }

  async resetMaxRoundBet(roomId: string): Promise<void> {
    const maxRoundBet: GameState = await this.gameStateService.getOneState(
      roomId,
    );
    maxRoundBet.currentMaxBet = 0;
    await maxRoundBet.save();
  }
  async resetPot(roomId: string): Promise<void> {
    const maxRoundBet: GameState = await this.gameStateService.getOneState(
      roomId,
    );
    maxRoundBet.pot = 0;
    await maxRoundBet.save();
  }

  async check(clientId: string, roomId: string): Promise<void> {
    const playerIndexInGame: number =
      await this.gameStateService.getPlayerIndexInGame(clientId, roomId);
    this.game.check(playerIndexInGame);
  }

  async fold(clientId: string, roomId: string) {
    const playerIndexInGame: number =
      await this.gameStateService.getPlayerIndexInGame(clientId, roomId);

    await this.gameStateService.setCurrentDecision(
      clientId,
      roomId,
      currentDecision.FOLD,
    );
    try {
      //remove player hand from the game
      this.game.players[playerIndexInGame].hand = [
        { suit: '', value: -1 },
        { suit: '', value: -1 },
      ];
      this.game.players[playerIndexInGame].folded = true;
      this.game.players[playerIndexInGame].active = false;
      // this.game.fold(playerIndexInGame);

      if (this.isAllPlayersFolded()) {
        return END_GAME;
      }
    } catch {
      return END_GAME;
    }
    return await this.nextActivePlayer(roomId);
  }

  async call(clientId: string, roomId: string) {
    const playerIndexInGame: number =
      await this.gameStateService.getPlayerIndexInGame(clientId, roomId);

    const roomState: GameState = await this.gameStateService.getOneState(
      roomId,
    );
    const player: Players = await Players.findOne({ where: { clientId } });
    if (roomState.currentMaxBet > player.currentBet) {
      player.balance -= roomState.currentMaxBet - player.currentBet;
      roomState.pot += roomState.currentMaxBet - player.currentBet;
      player.currentBet = roomState.currentMaxBet;

      await roomState.save();
      await player.save();
    }
    this.game.call(playerIndexInGame);

    await this.gameStateService.setCurrentDecision(
      clientId,
      roomId,
      currentDecision.CALL,
    );
    return await this.nextActivePlayer(roomId);
  }

  async raise(clientId: string, roomId: string, value: number) {
    const playerIndexInGame: number =
      await this.removePreviousPlayersActionIfNotFolded(clientId, roomId);
    const player: Players = await Players.findOne({ where: { clientId } });

    const roomState: GameState = await this.gameStateService.getOneState(
      roomId,
    );
    roomState.currentMaxBet = value;
    roomState.pot += value - player.currentBet;
    await roomState.save();

    this.game.raise(playerIndexInGame, value);

    return await this.nextActivePlayer(roomId);
  }

  availableAction(playerIndex: number) {
    return this.getPlayersFromGameState()[playerIndex].availableActions;
  }

  async getPlayerCards(indexInGame: number) {
    return this.getPlayersFromGameState()[indexInGame].hand;
  }

  async getPlayersInRoom(roomId: string): Promise<Players[]> {
    return (await this.gameStateService.findPlayersInRoom(roomId)).players;
  }
  async getPlayersIndexAndBalance(
    roomId: string,
  ): Promise<{ playerIndex: number; balance: number }[]> {
    return await this.gameStateService.getPlayersIndexAndBalance(roomId);
  }
  async getFinalResults(roomId: string, pot: number) {
    const players: GameState = await this.gameStateService.findPlayersInRoom(
      roomId,
    );
    await this.gameStateService.setActivePlayer(
      ALL_PLAYERS_MAKE_DECISION,
      roomId,
    );
    const playersHands = this.getPlayersFromGameState();
    const isAllPlayersFolded: boolean = this.isAllPlayersFolded();

    const checkResult = isAllPlayersFolded
      ? { index: this.lastNotFoldedPlayerIndex(), name: '' }
      : this.game.checkResult();

    const playerWins: number = await this.getPlayerIndexAtTable(
      checkResult.index,
      roomId,
    );

    let finalResults = [];
    players.players.map((player: Players): void => {
      if (player.currentDecision !== currentDecision.NOT_PLAYING) {
        const newBalance =
          player.playerIndex === playerWins
            ? (player.balance += pot)
            : player.balance;
        player.balance = newBalance;
        player.currentDecision = currentDecision.NOT_PLAYING;

        player.save();
        finalResults.push({
          playerWins: playerWins,
          winningHand: checkResult.name,
          playerIndex: player.playerIndex,
          balance: newBalance,
          currentBet: '',
          hand:
            player.currentDecision === currentDecision.FOLD
              ? {}
              : playersHands[player.playerIndexInGame].hand,
        });
      }
    });
    return finalResults;
  }
  async aiAnswer() {
    const { pot, communityCards } = this.getGameState();
    const { currentMaxBet } = await this.gameStateService.getOneState(
      DEFAULT_ROOM_ID,
    );
    const question = `
      your hand: ${ai_hand},
      current pot: ${pot},
      current round bet: ${currentMaxBet},
      common cards: ${JSON.stringify(communityCards)}
      `;
    const answer = (
      await this.playerAiService.getAiAnswer(question)
    ).toLowerCase();

    if (answer.includes(currentDecision.CALL)) {
      return await this.call(AI_PLAYER_CLIENT_ID, DEFAULT_ROOM_ID);
    } else if (answer.includes(currentDecision.FOLD)) {
      return await this.fold(AI_PLAYER_CLIENT_ID, DEFAULT_ROOM_ID);
    } else if (answer.includes(currentDecision.RAISE)) {
      return await this.raise(
        AI_PLAYER_CLIENT_ID,
        DEFAULT_ROOM_ID,
        currentMaxBet + 50,
      );
    } else if (answer.includes(currentDecision.CHECK)) {
      return await this.call(AI_PLAYER_CLIENT_ID, DEFAULT_ROOM_ID);
    } else console.log('AI wrong answer!');
  }

  async nextActivePlayer(roomId: string) {
    const nextActivePlayer = await this.nextPlayer(roomId);

    if (nextActivePlayer === DEFAULT_AI_POSITION) {
      const newGameStateAfterAi = await this.aiAnswer();

      return newGameStateAfterAi;
    }
    if (nextActivePlayer !== ALL_PLAYERS_MAKE_DECISION) {
      return this.gameStateService.setActivePlayer(nextActivePlayer, roomId);
    }
    if (this.game.getState().communityCards.length === 5) {
      return END_GAME;
    }
    return ALL_PLAYERS_MAKE_DECISION;
  }

  getGameState() {
    return this.game.getState();
  }

  getPlayersFromGameState() {
    return this.game.getState().players;
  }

  lastNotFoldedPlayerIndex() {
    return this.getPlayersFromGameState().findIndex((player) => !player.folded);
  }

  isAllPlayersFolded() {
    return (
      this.lastNotFoldedPlayerIndex() !== ALL_PLAYERS_MAKE_DECISION &&
      this.getPlayersFromGameState().filter((player) => !player.folded)
        .length === 1
    );
  }
  async removePreviousPlayersActionIfNotFolded(
    clientId: string,
    roomId: string,
  ): Promise<number> {
    const players: Players[] = await this.getPlayersInRoom(roomId);
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
      if (
        player.decision !== currentDecision.RAISE &&
        player.decision !== currentDecision.FOLD
      )
        player.decision = '';
    }
    return this.gameStateService.getPlayerIndexInGame(clientId, roomId);
  }

  async smallestBet(playersInRoom: Players[]): Promise<number> {
    const stillPlayingPlayers: Players[] = playersInRoom.filter(
      (player: Players): boolean =>
        player.currentDecision === currentDecision.NOT_DECIDED,
    );
    if (stillPlayingPlayers.length === 0) {
      return ALL_PLAYERS_MAKE_DECISION;
    }
    if (stillPlayingPlayers.length > 1) {
      const smallestBet: Players = stillPlayingPlayers.reduce((acc, curr) =>
        curr.currentBet < acc.currentBet ? curr : acc,
      );
      return smallestBet.playerIndex;
    }
    if (stillPlayingPlayers.length === 1) {
      return stillPlayingPlayers[0].playerIndex;
    }
  }

  async nextPlayer(roomId: string): Promise<number> {
    const playersInRoom: Players[] = await this.getPlayersInRoom(roomId);
    if (
      playersInRoom.find(
        (player: Players): boolean =>
          player.currentDecision === currentDecision.RAISE,
      )
    ) {
      return await this.smallestBet(playersInRoom);
    }

    for (let i = 0; i < playersInRoom.length; i++) {
      const player: Players = playersInRoom[i];

      if (player.currentDecision === currentDecision.NOT_DECIDED) {
        return player.playerIndex;
      }
    }
    return ALL_PLAYERS_MAKE_DECISION;
  }

  async getActivePlayer(roomId: string): Promise<number> {
    const oneState: GameState = await this.gameStateService.getOneState(roomId);
    return oneState.activePlayer;
  }

  async getPlayerIndexAtTable(
    indexInGame: number,
    roomId: string,
  ): Promise<number> {
    const playersInRoom: Players[] = await this.getPlayersInRoom(roomId);
    const player: Players = playersInRoom.find(
      (player: Players): boolean => player.playerIndexInGame === indexInGame,
    );
    return player.playerIndex;
  }

  async getPot(roomId: string): Promise<number> {
    return (await this.gameStateService.getOneState(roomId)).pot;
  }

  async getCurrentMaxBet(roomId: string): Promise<number> {
    return (await this.gameStateService.getOneState(roomId)).currentMaxBet;
  }

  async ifPlayerInGame(clientId: string, roomId: string): Promise<boolean> {
    const playersInRoom: Players[] = await this.getPlayersInRoom(roomId);
    const player: Players = playersInRoom.find(
      (player: Players): boolean => player.clientId === clientId,
    );
    return player.currentDecision !== currentDecision.NOT_PLAYING;
  }
}
