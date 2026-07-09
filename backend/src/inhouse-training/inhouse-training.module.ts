import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InHouseTrainingTemplate } from './inhouse-training-template.entity';
import { InHouseTrainingRecord } from './inhouse-training-record.entity';
import { InHouseTrainingController } from './inhouse-training.controller';
import { InHouseTrainingService } from './inhouse-training.service';

@Module({
    imports: [TypeOrmModule.forFeature([InHouseTrainingTemplate, InHouseTrainingRecord])],
    controllers: [InHouseTrainingController],
    providers: [InHouseTrainingService],
    exports: [TypeOrmModule, InHouseTrainingService],
})
export class InHouseTrainingModule {}
