import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssistantService } from './assistant.service';
import { ChatDto } from './dto/chat.dto';
import { SpeakDto } from './dto/speak.dto';

type UploadedAudio = { buffer: Buffer; mimetype: string; size: number };

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('chat')
  chat(@Body() data: ChatDto) {
    return this.assistant.chat(data.message);
  }

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 8 * 1024 * 1024 } }))
  transcribe(@UploadedFile() audio?: UploadedAudio) {
    if (!audio?.buffer || !audio.mimetype.startsWith('audio/')) {
      throw new BadRequestException('Envía una grabación de audio válida.');
    }
    return this.assistant.transcribeAudio(audio.buffer, audio.mimetype);
  }

  @Post('speak')
  speak(@Body() data: SpeakDto) {
    return this.assistant.synthesizeSpeech(data.text);
  }
}
