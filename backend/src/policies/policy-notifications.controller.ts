import { Controller, Get, Patch, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { PolicyNotificationsService } from './policy-notifications.service';

@Controller('policy-notifications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PolicyNotificationsController {
  constructor(private service: PolicyNotificationsService) {}

  @Get('my')
  @Roles(UserRole.STAFF)
  my(@Request() req) {
    return this.service.my(req.user.userId);
  }

  @Patch(':id/read')
  @Roles(UserRole.STAFF)
  read(@Request() req, @Param('id') id: string) {
    return this.service.markRead(req.user.userId, id);
  }
}

