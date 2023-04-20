import {
  BaseEntity,
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ArrayUnique } from 'class-validator';
import { Players } from '../players/players.entity';

export enum round {
  PREFLOP = 'preflop',
  FLOP = 'flop',
  TURN = 'turn',
  RIVER = 'river',
  ROUND_NOT_STARTED = 'round not started',
}

@Entity()
export class GameState extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  gameStateId: string;

  @Column({
    nullable: false,
    type: 'simple-array',
    default: '',
  })
  @ArrayUnique()
  seatsAvailable: number[];

  @Column({ nullable: true, type: 'smallint' })
  blinds: number;

  @Column({ nullable: true, type: 'int' })
  pot: number;

  @Column({ nullable: true, type: 'smallint' })
  activePlayer: number;

  @Column({
    type: 'enum',
    enum: round,
    default: round.ROUND_NOT_STARTED,
  })
  currentRound;

  @ManyToMany(() => Players, (players) => players.gameStates)
  players: Players[];
}
