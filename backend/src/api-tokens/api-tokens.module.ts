import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiToken } from './api-token.entity';
import { ApiTokensService } from './api-tokens.service';
import { ApiTokensController } from './api-tokens.controller';
import { ApiTokenGuard } from './api-token.guard';

@Module({
    imports: [TypeOrmModule.forFeature([ApiToken])],
    controllers: [ApiTokensController],
    providers: [ApiTokensService, ApiTokenGuard],
    exports: [ApiTokensService, ApiTokenGuard, TypeOrmModule],
})
export class ApiTokensModule {}
