import { Injectable } from '@nestjs/common';
import { Game } from 'holdem-poker';
import { Client } from './game-flow.gateway';

const INITIAL_BET = 10;
const DEFAULT_PLAYER_MONEY = 100;
const PLAYER_CONFIG = [DEFAULT_PLAYER_MONEY, DEFAULT_PLAYER_MONEY];

@Injectable()
export class GameFlowService {
  game: any = new Game(PLAYER_CONFIG, INITIAL_BET);
  playersList: Client[] = [];

  playerJoin(clientId: string) {
    if (this.playersList.some((player) => player['clientId'] === clientId)) {
      console.log('You are already sitting at the table');
    } else
      this.playersList.push({
        clientId: clientId,
        playerBalance: DEFAULT_PLAYER_MONEY,
      });
    return this.playersList.findIndex((player) => player.clientId === clientId);
  }
  playerLeave = (clientId) => {
    for (let i = 0; i < this.playersList.length; i++) {
      if (this.playersList[i].clientId === clientId) {
        this.playersList.splice(i, 1);
        break;
      }
    }
  };

  create(clientId: string) {
    if (this.playersList.length > 1) {
      this.game.newRound(
        this.playersList.map((player) => player.playerBalance),
        10,
      );
      this.game.startRound();

      return this.game.getState().players.map((hands) => hands.hand);
    } else {
      console.log('Wait for at least one more player.');
      return [];
    }
  }

  endRound() {
    try {
      this.game.endRound();
    } catch {
      return this.game.checkResult();
    }
    return this.game.getState().communityCards;
  }
}
