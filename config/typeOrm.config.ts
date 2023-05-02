import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SingleRoom } from '../src/single-room/singleRoom.entity';
import { GameState } from '../src/game-state/game-state.entity';
import { Players } from '../src/players/players.entity';

export const TYPEORM_CONFIG: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'poker',
  entities: [SingleRoom, GameState, Players],
  // entities: ['dist/**/**.entity{.ts,.js}', "src/**/*.entity{.ts,.js}"],
  bigNumberStrings: false,
  logging: true,
  synchronize: true,
};
