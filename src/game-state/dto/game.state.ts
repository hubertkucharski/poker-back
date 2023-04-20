import { BaseEntity } from 'typeorm';
import { round } from '../game-state.entity';

export class GameState extends BaseEntity {
  id: string;
  seatsAvailable: string[];
  blinds: number;
  pot: number;
  activePlayer: number;
  currentRound: round;
}
