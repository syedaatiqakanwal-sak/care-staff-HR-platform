import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { StaffModule } from '../staff/staff.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        forwardRef(() => StaffModule),
    ],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule { }
