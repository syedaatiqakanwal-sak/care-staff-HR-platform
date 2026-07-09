import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { DASHBOARD_ROLES, MANAGEMENT_ROLES } from '../users/role.utils';

@Controller('courses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    @Post()
    @Roles(...MANAGEMENT_ROLES)
    create(@Body() createCourseDto: CreateCourseDto) {
        return this.coursesService.create(createCourseDto);
    }

    @Get()
    @Roles(...DASHBOARD_ROLES, UserRole.STAFF)
    findAll() {
        return this.coursesService.findAll();
    }

    @Put(':id')
    @Roles(UserRole.ADMIN)
    update(@Param('id') id: string, @Body() updateCourseDto: CreateCourseDto) {
        return this.coursesService.update(id, updateCourseDto);
    }

    @Delete(':id')
    @Roles(...MANAGEMENT_ROLES)
    remove(@Param('id') id: string) {
        return this.coursesService.remove(id);
    }
}
