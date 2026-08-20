import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/interfaces';
import { CreateSaleReturnBodyDto, PreviewSaleReturnDto } from './dto/create-sale-return.dto';
import { SaleReturnService } from './sale-return.service';

import { IdempotencyGuard } from '../../common/guards/idempotency.guard';

@Controller('sales')
@UseGuards(JwtAuthGuard, IdempotencyGuard)
export class SaleReturnController {
    constructor(private readonly saleReturnService: SaleReturnService) { }

    @Post(':originalSaleId/returns')
    create(
        @Param('originalSaleId', ParseUUIDPipe) originalSaleId: string,
        @Body() dto: CreateSaleReturnBodyDto,
    ) {
        return this.saleReturnService.create({ ...dto, originalSaleId });
    }

    @Get(':originalSaleId/returns')
    findByOriginalSale(@Param('originalSaleId', ParseUUIDPipe) originalSaleId: string) {
        return this.saleReturnService.findByOriginalSale(originalSaleId);
    }

    @Post('returns/preview')
    @HttpCode(200)
    preview(@Body() dto: PreviewSaleReturnDto) {
        return this.saleReturnService.preview(dto);
    }

    @Patch('returns/:id/commit')
    commit(@Param('id', ParseUUIDPipe) id: string, @Request() req: AuthenticatedRequest) {
        return this.saleReturnService.commit(id, req.user?.userId);
    }

    @Patch('returns/:id/cancel')
    cancel(@Param('id', ParseUUIDPipe) id: string) {
        return this.saleReturnService.cancel(id);
    }

    @Get('returns/:id/receipt.pdf')
    async receiptPdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
        const pdf = await this.saleReturnService.renderReceiptPdf(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="return-${id}.pdf"`);
        res.send(pdf);
    }
}
