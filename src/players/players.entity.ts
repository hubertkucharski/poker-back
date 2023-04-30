import {
  BaseEntity,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GameState, round } from '../game-state/game-state.entity';
import { Max } from 'class-validator';

export enum currentDecision {
  NOT_DECIDED = 'not decided',
  FOLD = 'fold',
  CALL = 'call',
  RAISE = 'raise',
  NOT_PLAYING = 'not playing',
}

@Entity()
export class Players extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, type: 'varchar' })
  clientId: string;

  @Column({ nullable: true, type: 'int', default: 1000 })
  balance: number;

  @Column({ nullable: true, type: 'int', default: 0 })
  currentBet: number;

  @Column({ nullable: false, type: 'smallint', default: -1 })
  @Max(6)
  playerIndex: number;

  @Column({ nullable: false, type: 'smallint', default: -1 })
  @Max(6)
  playerIndexInGame: number;

  @Column({
    type: 'enum',
    enum: currentDecision,
    default: currentDecision.NOT_PLAYING,
  })
  currentDecision;

  @ManyToMany(() => GameState, (gameState) => gameState.players)
  @JoinTable()
  gameStates: GameState[];
}
