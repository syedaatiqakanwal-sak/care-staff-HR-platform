import { Controller, Get, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { VleCredentialsService } from './vle-credentials.service';
import { JwtOrApiTokenGuard } from '../staff/jwt-or-api-token.guard';

@Controller('staff/:id/vle-credentials')
@UseGuards(JwtOrApiTokenGuard)
export class VleCredentialsController {
    constructor(private readonly vleService: VleCredentialsService) { }

    @Get()
    async getCredentials(@Req() req, @Param('id') id: string) {
        return this.vleService.getCredentials(req.user, id);
    }

    @Patch()
    async updateCredentials(
        @Req() req,
        @Param('id') id: string,
        @Body() body: { username: string; password?: string }
    ) {
        return this.vleService.updateCredentials(req.user, id, body);
    }
}
