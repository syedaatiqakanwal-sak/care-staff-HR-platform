import { Controller, Get, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { JwtOrApiTokenGuard } from './jwt-or-api-token.guard';

@Controller('dashboard')
@UseGuards(JwtOrApiTokenGuard, RolesGuard)
export class DashboardController {
    constructor(private staffService: StaffService) { }

    @Get('stats')
    @Roles(UserRole.ADMIN)
    getStats() {
        return this.staffService.getDashboardStats();
    }
}
