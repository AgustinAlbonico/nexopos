import { IsObject } from 'class-validator';

export class GenerateVariantsDto {
    @IsObject()
    attributes!: Record<string, string[]>;
}
