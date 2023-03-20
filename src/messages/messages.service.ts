import {Injectable} from '@nestjs/common';
import {CreateMessageDto} from './dto/create-message.dto';
import {UpdateMessageDto} from './dto/update-message.dto';
import {Message} from "./entities/message.entity";

@Injectable()
export class MessagesService {
    messages: Message[] = []
    clientToUser = {}
    identify(name: string, clientId: string) {
        this.clientToUser[clientId] = name;

        return Object.values(this.clientToUser);
    }

    getClientName(clientId: string){
        return this.clientToUser[clientId];
    }

    create(createMessageDto: CreateMessageDto, clientId: string) {
        const message = {name: this.clientToUser[clientId], text: createMessageDto.text};

        this.messages.push(createMessageDto)

        return message;
    }

    findAll() {
        //add query to get all messages for this table stored in db
        return this.messages;
    }

    findOne(id: number) {
        return `This action returns a #${id} message`;
    }

    update(id: number, updateMessageDto: UpdateMessageDto) {
        return `This action updates a #${id} message`;
    }

    remove(id: number) {
        return `This action removes a #${id} message`;
    }

}
