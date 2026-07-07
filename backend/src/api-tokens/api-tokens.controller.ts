import { Controller, Post, Get, Delete, Body, UseGuards, Request, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTokensService } from './api-tokens.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

@Controller('api/manage/tokens')
@UseGuards(AuthGuard('jwt')) // Requires existing JWT session auth
export class ApiTokensController {
    constructor(private readonly apiTokensService: ApiTokensService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createToken(@Request() req: any, @Body() createDto: CreateApiTokenDto) {
        const userId = req.user.userId;
        
        const { token, apiToken } = await this.apiTokensService.createToken(
            userId,
            createDto.name,
            createDto.scopes || [],
            createDto.expiresInDays,
        );

        // Return token info with plain token ONCE
        return {
            success: true,
            token, // Plain token - only returned once!
            apiToken: {
                id: apiToken.id,
                name: apiToken.name,
                scopes: apiToken.scopes,
                lastUsedAt: apiToken.lastUsedAt,
                expiresAt: apiToken.expiresAt,
                createdAt: apiToken.createdAt,
            },
            message: 'Token created successfully. Save this token now - it will not be shown again.',
        };
    }

    @Get()
    async findAll(@Request() req: any) {
        const userId = req.user.userId;
        const tokens = await this.apiTokensService.findAllByUser(userId);

        // Return tokens without hash
        return {
            success: true,
            tokens: tokens.map(token => ({
                id: token.id,
                name: token.name,
                scopes: token.scopes,
                lastUsedAt: token.lastUsedAt,
                expiresAt: token.expiresAt,
                createdAt: token.createdAt,
            })),
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async deleteToken(@Request() req: any, @Param('id') id: string) {
        const userId = req.user.userId;
        await this.apiTokensService.deleteToken(id, userId);

        return {
            success: true,
            message: 'Token deleted successfully',
        };
    }
}
