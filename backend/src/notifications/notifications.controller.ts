import { Controller, Get, Patch, Param, UseGuards, Req, Put } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationsController {
    constructor(private readonly service: NotificationsService) { }

    @Get()
    async getMyNotifications(@Req() req) {
        return this.service.findAllForUser(req.user.userId);
    }

    @Patch(':id/read')
    async markRead(@Param('id') id: string, @Req() req) {
        return this.service.markRead(id, req.user.userId);
    }

    @Put('read-all')
    async markAllRead(@Req() req) {
        return this.service.markAllRead(req.user.userId);
    }
}
