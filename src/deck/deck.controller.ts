import { Controller, Inject, Get } from '@nestjs/common';
import { DeckService } from './deck.service';

@Controller('deck')
export class DeckController {
  constructor(@Inject(DeckService) private deckService: DeckService) {}

  // @Get("/deal/:numberOfPlayers")
  @Get('/deal')
  async create() {
    return this.deckService.deal();
  }
}
