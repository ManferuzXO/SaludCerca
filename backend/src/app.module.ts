import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { CentersModule } from './centers/centers.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AssistantModule } from './assistant/assistant.module';

@Module({
  imports: [DatabaseModule, CentersModule, AuthModule, AppointmentsModule, AssistantModule],
  controllers: [HealthController],
})
export class AppModule {}
