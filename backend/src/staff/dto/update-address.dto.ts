import { IsOptional, IsString } from 'class-validator';

export class UpdateAddressDto {
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
    @IsString()
    dateFrom?: string;

    @IsOptional()
    @IsString()
    dateTo?: string;
}
