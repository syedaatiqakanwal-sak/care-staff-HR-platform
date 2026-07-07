import { IsString, IsInt, IsArray, IsOptional, IsEnum } from 'class-validator';

export class CreateCourseDto {
    @IsString()
    title: string;

    @IsInt()
    month: number;

    @IsString()
    provider: string;

    @IsString()
    duration: string;

    @IsArray()
    @IsString({ each: true })
    categories: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    subModules?: string[];
}
