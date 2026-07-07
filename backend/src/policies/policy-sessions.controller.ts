import { Body, Controller, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { PoliciesService } from './policies.service';
import { UpdatePolicySessionDto } from './dto/update-policy-session.dto';

@Controller('policy-sessions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PolicySessionsController {
  constructor(private policiesService: PoliciesService) {}

  @Patch(':id')
  @Roles(UserRole.STAFF)
  async complete(@Request() req, @Param('id') id: string, @Body() dto: UpdatePolicySessionDto) {
    // Do not trust durationSeconds from client; recompute from timestamps server-side.
    return this.policiesService.completeSessionFromClient(req.user.userId, id, dto.endTime);
  }
}

