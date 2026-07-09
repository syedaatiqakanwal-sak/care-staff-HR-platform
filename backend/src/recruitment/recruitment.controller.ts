import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MANAGEMENT_ROLES } from '../users/role.utils';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentAccessService } from './recruitment-access.service';
import { UpdateRecruitmentDto } from './dto/update-recruitment.dto';

@Controller('staff')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class RecruitmentController {
  constructor(
    private readonly recruitmentService: RecruitmentService,
    private readonly access: RecruitmentAccessService,
  ) {}

  @Get(':id/recruitment')
  @Roles(...MANAGEMENT_ROLES)
  async getRecruitment(@Param('id') userId: string, @Request() req) {
    const profile = await this.access.assertManagementAccess(req.user, userId);
    const record = await this.recruitmentService.getByStaffProfileId(profile.id);
    return {
      success: true,
      recruitment: record,
      employmentStatus: profile.employmentStatus,
    };
  }

  @Put(':id/recruitment')
  @Roles(...MANAGEMENT_ROLES)
  async updateRecruitment(
    @Param('id') userId: string,
    @Request() req,
    @Body() dto: UpdateRecruitmentDto,
  ) {
    const profile = await this.access.assertManagementAccess(req.user, userId);
    const { record, profile: updatedProfile } =
      await this.recruitmentService.upsertForStaffProfileId(profile.id, dto);
    return {
      success: true,
      recruitment: record,
      employmentStatus: updatedProfile.employmentStatus,
    };
  }
}
