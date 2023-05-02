import { Inject, Injectable } from '@nestjs/common';
import { Game } from 'holdem-poker';
import { GameStateService } from '../game-state/game-state.service';
import { currentDecision, Players } from '../players/players.entity';

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
        player.currentBet = 0;
        player.save();
      }
    });
    await this.nextRoundFirstPlayer(roomId);
    await this.resetMaxRoundBet(roomId);
    this.game.endRound();
    this.game.startRound();
  }
  async nextRoundFirstPlayer(roomId) {
    const playersInRoom = await this.getPlayersInRoom(roomId);
    const stillPlayingPlayer = playersInRoom.find(
      (player) =>
        player.currentDecision !== currentDecision.NOT_PLAYING &&
        player.currentDecision !== currentDecision.FOLD,
    );
    if (!stillPlayingPlayer) {
      await this.gameStateService.setActivePlayer(
        ALL_PLAYERS_MAKE_DECISION,
        roomId,
      );
    } else {
      const playerIndex = stillPlayingPlayer.playerIndex;
      await this.gameStateService.setActivePlayer(playerIndex, roomId);
    }
  }
  async startRound(roomId) {
    const playersInRoom = await this.getPlayersInRoom(roomId);
    await this.resetMaxRoundBet(roomId);
    await this.resetPot(roomId);
    if (playersInRoom.length <= 1) {
      console.log('Wait for at least one more player.');
      return [];
    }
    await this.gameStateService.setActivePlayer(
      playersInRoom.find((player) => player.playerIndex > -1).playerIndex,
      roomId,
    );
    this.game.newRound(
      playersInRoom.map((player, index) => {
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

  async resetMaxRoundBet(roomId) {
    const maxRoundBet = await this.gameStateService.getOneState(roomId);
    maxRoundBet.currentMaxBet = 0;
    await maxRoundBet.save();
  }
  async resetPot(roomId) {
    const maxRoundBet = await this.gameStateService.getOneState(roomId);
    maxRoundBet.pot = 0;
    await maxRoundBet.save();
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

      if (this.isAllPlayersFolded()) return END_GAME;
    } catch {
      return END_GAME;
    }
    try {
      //remove player hand from the game
      this.game.players[playerIndexInGame].hand = [
        { suit: '', value: -1 },
        { suit: '', value: -1 },
      ];
      this.game.players[playerIndexInGame].folded = true;
      this.game.players[playerIndexInGame].active = false;
      // this.game.fold(playerIndexInGame);

      if (this.isAllPlayersFolded()) return END_GAME;
    } catch {
      return END_GAME;
    }
    return await this.nextActivePlayer(roomId);
  }

  async call(clientId, roomId) {
    const playerIndexInGame = await this.gameStateService.getPlayerIndexInGame(
      clientId,
      roomId,
    );

    const roomState = await this.gameStateService.getOneState(roomId);
    const player = await Players.findOne({ where: { clientId } });
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
    return this.nextActivePlayer(roomId);
  }

  async raise(clientId, roomId, value: number) {
    const playerIndexInGame = await this.removePreviousPlayersActionIfNotFolded(
      clientId,
      roomId,
    );
    const player = await Players.findOne({ where: { clientId } });

    const roomState = await this.gameStateService.getOneState(roomId);
    roomState.currentMaxBet = value;
    roomState.pot += value - player.currentBet;
    await roomState.save();

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
  async getFinalResults(roomId: string, pot: number) {
    const players = await this.gameStateService.findPlayersInRoom(roomId);
    await this.gameStateService.setActivePlayer(
      ALL_PLAYERS_MAKE_DECISION,
      roomId,
    );
    const playersHands = this.getPlayersFromGameState();
    const isAllPlayersFolded = this.isAllPlayersFolded();

    const checkResult = isAllPlayersFolded
      ? { index: this.lastNotFoldedPlayerIndex(), name: '' }
      : this.game.checkResult();

    const playerWins = await this.getPlayerIndexAtTable(
      checkResult.index,
      roomId,
    );

    let finalResults = [];
    players.players.map((player) => {
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

  async nextActivePlayer(roomId: string) {
    const nextActivePlayer = await this.nextPlayer(roomId);

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

  async smallestBet(playersInRoom) {
    const stillPlayingPlayers = playersInRoom.filter(
      (player) => player.currentDecision === currentDecision.NOT_DECIDED,
    );
    if (stillPlayingPlayers.length === 0) {
      return ALL_PLAYERS_MAKE_DECISION;
    }
    if (stillPlayingPlayers.length > 1) {
      const smallestBet = stillPlayingPlayers.reduce((acc, curr) =>
        curr.currentBet < acc.currentBet ? curr : acc,
      );
      return smallestBet.playerIndex;
    }
    if (stillPlayingPlayers.length === 1) {
      return stillPlayingPlayers[0].playerIndex;
    }
  }

  async nextPlayer(roomId: string) {
    const playersInRoom = await this.getPlayersInRoom(roomId);
    if (
      playersInRoom.find(
        (player) => player.currentDecision === currentDecision.RAISE,
      )
    ) {
      return await this.smallestBet(playersInRoom);
    }

    for (let i = 0; i < playersInRoom.length; i++) {
      const player = playersInRoom[i];

      if (player.currentDecision === currentDecision.NOT_DECIDED) {
        return player.playerIndex;
      }
    }
    return ALL_PLAYERS_MAKE_DECISION;
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

  async getPot(roomId) {
    return (await this.gameStateService.getOneState(roomId)).pot;
  }

  async getCurrentMaxBet(roomId) {
    return (await this.gameStateService.getOneState(roomId)).currentMaxBet;
  }

  async ifPlayerInGame(clientId, roomId) {
    const playersInRoom = await this.getPlayersInRoom(roomId);
    const player = playersInRoom.find((player) => player.clientId === clientId);
    return player.currentDecision !== currentDecision.NOT_PLAYING;
  }
}
