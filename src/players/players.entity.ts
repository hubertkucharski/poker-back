import {
  BaseEntity,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GameState } from '../game-state/game-state.entity';
import { Max } from 'class-validator';

@Entity()
export class Players extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, type: 'varchar' })
  clientId: string;

  @Column({ nullable: true, type: 'int', default: 1000 })
  balance: number;

  @Column({ nullable: false, type: 'smallint', default: -1 })
  @Max(6)
  playerIndex: number;

  @ManyToMany(() => GameState, (gameState) => gameState.players)
  @JoinTable()
  gameStates: GameState[];
}
