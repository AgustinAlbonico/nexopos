import { Controller, Get, Post, Body, Header, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MatrixImportService } from './matrix-import.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('products/matrix-import')
@UseGuards(JwtAuthGuard)
export class MatrixImportController {
    constructor(private readonly matrixImportService: MatrixImportService) {}

    @Get('template')
    @Header('Content-Type', 'text/csv; charset=utf-8')
    @Header('Content-Disposition', 'attachment; filename="plantilla_matriz_indumentaria.csv"')
    getTemplate(@Res() res: Response) {
        const csvContent = this.matrixImportService.getTemplateCsv();
        res.send(csvContent);
    }

    @Post('preview')
    async preview(@Body('csv') csv: string) {
        return this.matrixImportService.preview(csv);
    }

    @Post('commit')
    async commit(@Body('csv') csv: string) {
        return this.matrixImportService.commit(csv);
    }
}
