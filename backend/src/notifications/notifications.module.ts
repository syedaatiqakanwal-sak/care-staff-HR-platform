import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Global() // Make it global so we can inject Service into Certificates easily
@Module({
    imports: [TypeOrmModule.forFeature([Notification])],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
