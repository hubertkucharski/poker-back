import { Injectable } from '@nestjs/common';
import { CreateGameFlowDto } from './dto/create-game-flow.dto';
import { UpdateGameFlowDto } from './dto/update-game-flow.dto';
import { Game } from 'holdem-poker';

const INITIAL_BET = 10;
const DEFAULT_PLAYER_MONEY = 100;
const PLAYER_CONFIG = [DEFAULT_PLAYER_MONEY, DEFAULT_PLAYER_MONEY];

@Injectable()
export class GameFlowService {
  game: any = new Game(PLAYER_CONFIG, INITIAL_BET);
  clientToUser = {};

  create(createGameFlowDto: CreateGameFlowDto, clientId: string) {
    this.game.startRound();
    console.log('clientId ', clientId);
    return this.game.players.map((hands) => hands.hand);
  }

  flop(clientId: string) {
    console.log(this.game.canEndRound()); // always return true (why?)
    this.game.endRound();
    console.log('clientId ', clientId);
    return `This action returns flop`;
  }

  endRound() {
    try {
      this.game.endRound();
    } catch {
      return this.game.checkResult();
    }
    return this.game.getState().communityCards;
  }

  river() {
    return this.game.checkResult();
  }

  findOne(id: number) {
    return `This action returns a #${id} gameFlow`;
  }

  update(id: number, updateGameFlowDto: UpdateGameFlowDto) {
    return `This action updates a #${id} gameFlow`;
  }

  remove(id: number) {
    return `This action removes a #${id} gameFlow`;
  }
}
