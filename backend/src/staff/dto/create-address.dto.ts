import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateAddressDto {
    @IsOptional()
    @IsString()
    line1?: string;

    @IsOptional()
    @IsString()
    line2?: string;

    @IsOptional()
    @IsString()
    town?: string;

    @IsOptional()
    @IsString()
    postcode?: string;

    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @IsOptional()
    @IsDateString()
    dateTo?: string;
}
