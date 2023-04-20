import { Injectable } from '@nestjs/common';
import { Players } from './players.entity';

@Injectable()
export class PlayersService {
  async getAllPlayers() {
    return await Players.find();
  }
  async getOnePlayer(clientId) {
    return await Players.findOne({ where: { clientId: clientId } });
  }
  async addPlayer(clientId) {
    const newPlayer = new Players();
    newPlayer.clientId = clientId;
    newPlayer.balance = 999;
    await newPlayer.save();
    return newPlayer;
  }
  async addPlayerIndex(clientId, playerIndex: number) {
    const updatePlayer = await this.getOnePlayer(clientId);
    updatePlayer.playerIndex = playerIndex;
    await updatePlayer.save();
  }
  async removePlayerFromRoom(clientId) {
    try {
      const onePlayer = await this.getOnePlayer(clientId);
      await onePlayer.remove();
    } catch {
      console.log('Client does not exist.');
    }
  }
  async getPlayerIndex(clientId) {
    const onePlayer = await this.getOnePlayer(clientId);
    return onePlayer.playerIndex;
  }
}
