import { Injectable } from '@nestjs/common';
import { GameState } from '../game-flow/game-state.entity';
import { Players } from '../players/players.entity';

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
    newGameState.blinds = 3;
    newGameState.listOfPlayers = [];
    for (let i = 0; i < 6; i++) {
      newGameState.listOfPlayers.push(i);
    }
    await newGameState.save();
    return newGameState;
  }

  async updateState(id: string) {
    const oneGameState = await this.getOneState(id);
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
    const stateWithePlayersRelation = await GameState.find({
      relations: ['players'],
      where: { gameStateId: roomId },
    });
    return stateWithePlayersRelation[0];
  }

  async getPlayerIndex(clientId: string, roomId: string) {
    const oneGameState = await this.findPlayersInRoom(roomId);
    return oneGameState.players.findIndex(
      (player) => player.clientId === clientId,
    );
  }

  async addPlayerToTable(clientId: string, roomId: string) {
    const oneGameState = await this.findPlayersInRoom(roomId);
    const newPlayer = await Players.findOne({ where: { clientId: clientId } });

    if (!oneGameState.listOfPlayers) {
      return console.log('There is no free seats at this table.');
    }
    newPlayer.playerIndex = oneGameState.listOfPlayers[0];
    oneGameState.listOfPlayers.splice(0, 1);

    oneGameState.players = [...oneGameState.players, newPlayer];

    await oneGameState.save();
    await newPlayer.save();

    return newPlayer.playerIndex;
  }

  async removePlayerFromTable(clientId: string, roomId: string) {
    const oneGameState = await this.findPlayersInRoom(roomId);
    try {
      const player = await Players.findOneOrFail({
        where: { clientId: clientId },
      });
      if (player.playerIndex > -1) {
        oneGameState.listOfPlayers.push(player.playerIndex);
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
}
