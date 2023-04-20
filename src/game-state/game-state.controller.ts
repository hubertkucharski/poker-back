import { Controller, Get, Inject, Param, Post, Put } from '@nestjs/common';
import { GameStateService } from './game-state.service';
import { GameState } from './dto/game.state';
import { DEFAULT_ROOM_ID } from '../game-flow/game-flow.gateway';

@Controller('game-state')
export class GameStateController {
  constructor(
    @Inject(GameStateService) private gameStateService: GameStateService,
  ) {}

  @Get('/')
  getState(): Promise<any[]> {
    return this.gameStateService.getState();
  }
  @Get('/:roomId')
  getOneState(@Param('roomId') roomId: string): Promise<any> {
    return this.gameStateService.getOneState(roomId);
  }

  @Post('/')
  createState(): Promise<any> {
    return this.gameStateService.createState();
  }

  @Put('/')
  setState(): Promise<any> {
    return this.gameStateService.updateState(DEFAULT_ROOM_ID);
  }
}
