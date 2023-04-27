import { Injectable } from '@nestjs/common';
import { GameState } from './game-state.entity';
import { Players } from '../players/players.entity';
import { isLogLevelEnabled } from '@nestjs/common/services/utils';

const DEFAULT_BLINDS = 5;
const DEFAULT_NUMBER_OF_SEATS = 6;
const DEFAULT_ACTIVE_PLAYER = 0;

@Injectable()
export class GameStateService {
  constructor() {}

  async getState() {
    return await GameState.find();
  }

  async getOneState(roomId: string): Promise<GameState> {
    return await GameState.findOne({ where: { gameStateId: roomId } });
  }

  async createState(): Promise<GameState> {
    const newGameState = new GameState();
    newGameState.blinds = DEFAULT_BLINDS;
    newGameState.seatsAvailable = [];
    newGameState.activePlayer = DEFAULT_ACTIVE_PLAYER;
    for (let i = 0; i < DEFAULT_NUMBER_OF_SEATS; i++) {
      newGameState.seatsAvailable.push(i);
    }
    await newGameState.save();
    return newGameState;
  }

  async setActivePlayer(activePlayerIndex: number, roomId: string) {
    let oneGameState = await this.getOneState(roomId);
    oneGameState.activePlayer = activePlayerIndex;
    await oneGameState.save();
    return oneGameState;
  }

  async isPlayerAtTable(clientId: string, roomId: string) {
    try {
      const state = await this.findPlayersInRoom(roomId);

      return state.players.some((player) => player.clientId === clientId);
    } catch {
      return false;
    }
  }
  async findPlayersInRoom(roomId: string) {
    return (
      await GameState.find({
        relations: ['players'],
        where: { gameStateId: roomId },
      })
    )[0];
  }

  async getPlayerIndexInGame(clientId: string, roomId: string) {
    const oneGameState = await this.findPlayersInRoom(roomId);
    const player = oneGameState.players.find(
      (player) => player.clientId === clientId,
    );
    return player.playerIndexInGame;
  }

  async addPlayerToTable(clientId: string, roomId: string) {
    const oneGameState = await this.findPlayersInRoom(roomId);
    const newPlayer = await Players.findOne({ where: { clientId: clientId } });

    if (!oneGameState.seatsAvailable) {
      return console.log('There is no free seats at this table.');
    }
    newPlayer.playerIndex = oneGameState.seatsAvailable[0];
    oneGameState.seatsAvailable.splice(0, 1);

    oneGameState.players = [...oneGameState.players, newPlayer];

    await oneGameState.save();
    await newPlayer.save();

    return this.getPlayersIndexAndBalance(roomId);
  }
  async getPlayersIndexAndBalance(
    roomId,
  ): Promise<{ playerIndex: number; balance: number }[]> {
    const players = await this.findPlayersInRoom(roomId);

    let playersIndexAndBalance = [];
    players.players.map((player) =>
      playersIndexAndBalance.push({
        playerIndex: player.playerIndex,
        balance: player.balance,
      }),
    );

    return playersIndexAndBalance;
  }
  async removePlayerFromTable(clientId: string, roomId: string) {
    const oneGameState = await this.findPlayersInRoom(roomId);
    try {
      const player = await Players.findOneOrFail({
        where: { clientId: clientId },
      });
      if (player.playerIndex > -1) {
        oneGameState.seatsAvailable.push(player.playerIndex);
      }
      let { players } = oneGameState;
      for (let i = 0; i < players.length; i++) {
        if (players[i].clientId === clientId) {
          players.splice(i, 1);
          break;
        }
      }
      await GameState.save(oneGameState);
    } catch (e) {
      console.log('Error occurs: ', e);
    }
  }
  async setCurrentDecision(clientId, roomId, currentDecision) {
    const oneGameState = await this.findPlayersInRoom(roomId);
    const player = oneGameState.players.find(
      (player) => player.clientId === clientId,
    );
    player.currentDecision = currentDecision;

    await player.save();
  }
}
