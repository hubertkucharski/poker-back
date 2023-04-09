import { Injectable } from "@nestjs/common";
import { Game } from "holdem-poker";

@Injectable()
export class DeckService {

  async deal() {
    let hands = [];
    //new Game([ array size define number of players and player money ], 10 - initial bet)
    const game = new Game([100, 100, 100, 100], 10);
    game.getState().players.map(function(m) {
      hands.push(m.hand);
    });
    // game.checkResult()
    return hands;
  }
}
