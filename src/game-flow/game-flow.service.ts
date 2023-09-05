import { Inject, Injectable } from '@nestjs/common';
import { GameStateService } from '../game-state/game-state.service';
import { PlayersService } from '../players/players.service';
import { CycleManagerService } from '../cycle-manager/cycle-manager.service';

@Injectable()
export class GameFlowService {
  constructor(
    @Inject(GameStateService) private gameStateService: GameStateService,
    @Inject(PlayersService) private playersService: PlayersService,
  ) {}

  async playerJoin(clientId: string, roomId: string) {
    if (await this.gameStateService.isPlayerAtTable(clientId, roomId)) {
      console.log('You are already sitting at the table');
      const player = await this.playersService.getOnePlayer(clientId);

      return player.playerIndex;
    } else {
      await this.playersService.addPlayer(clientId);

      return await this.gameStateService.addPlayerToTable(clientId, roomId);
    }
  }

  async playerLeave(clientId, roomId) {
    await this.gameStateService.removePlayerFromTable(clientId, roomId);
    await this.playersService.removePlayerFromRoom(clientId);
  }

  async changePlayerBalance(clientId, value) {
    const updatePlayer = await this.playersService.getOnePlayer(clientId);
    updatePlayer.balance -= value - updatePlayer.currentBet;
    updatePlayer.currentBet = value;
    await updatePlayer.save();
  }
}
