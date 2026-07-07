import { IsString, IsArray, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateApiTokenDto {
    @IsString()
    name: string;

    @IsArray()
    @IsString({ each: true })
    scopes: string[];

    @IsOptional()
    @IsNumber()
    @Min(1)
    expiresInDays?: number;
}
