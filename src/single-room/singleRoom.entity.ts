import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class SingleRoom extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, })
  roomName: string;

  @Column({ nullable: true, type: "smallint" })
  playersAtTable: number;

  @Column({ nullable: true, type: "smallint" })
  blinds: number;

}
