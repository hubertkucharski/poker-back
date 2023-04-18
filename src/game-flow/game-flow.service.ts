import { Inject, Injectable } from '@nestjs/common';
import { Game } from 'holdem-poker';
import { GameStateService } from '../game-state/game-state.service';
import { PlayersService } from '../players/players.service';
import { Players } from '../players/players.entity';

const INITIAL_BET = 10;
const DEFAULT_PLAYER_MONEY = 100;
const PLAYER_CONFIG = [DEFAULT_PLAYER_MONEY, DEFAULT_PLAYER_MONEY];

@Injectable()
export class GameFlowService {
  constructor(
    @Inject(GameStateService) private gameStateService: GameStateService,
    @Inject(PlayersService) private playersService: PlayersService,
  ) {}
  game: any = new Game(PLAYER_CONFIG, INITIAL_BET);

  playerJoin(clientId: string) {
    if (this.playersList.some((player) => player['clientId'] === clientId)) {
      console.log('You are already sitting at the table');
      const player = await Players.findOne({ where: { clientId: clientId } });

      return player.playerIndex;
    } else {
      await this.playersService.addPlayer(clientId);

      return await this.gameStateService.addPlayerToTable(clientId, roomId);
    }
  }
  playerLeave = (clientId) => {
    for (let i = 0; i < this.playersList.length; i++) {
      if (this.playersList[i].clientId === clientId) {
        this.playersList.splice(i, 1);
        break;
      }
    }
  };

  async create(roomId: string) {
    const playersInRoom = await this.getPlayersInRoom(roomId);
    if (playersInRoom.length > 1) {
      this.game.newRound(
        playersInRoom.map((player) => player.balance),
        INITIAL_BET,
      );
      this.game.startRound();

      return this.game.getState().players.map((hands) => hands.hand);
    } else {
      console.log('Wait for at least one more player.');
      return [];
    }
  }

  async getPlayerCards(clientId: string, roomId: string) {
    const indexBe = await this.gameStateService.getPlayerIndex(
      clientId,
      roomId,
    );
    return this.game.getState().players[indexBe].hand;
  }

  endRound() {
    if (this.game.canEndRound()) {
      try {
        this.game.endRound();
      } catch {
        return this.game.checkResult();
      }
      return this.game.getState().communityCards;
    } else console.log(this.game.getState(), 'this.game.getState()');
  }
}
