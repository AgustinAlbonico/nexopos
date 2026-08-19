import {
    Body,
    Controller,
    Get,
    Header,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
    Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Product } from '../entities/product.entity';
import { LABEL_TEMPLATE_NAMES, LabelsService, type LabelTemplate, type ApparelLabelItem } from './labels.service';

/**
 * S2 H4 T10 — labels controller.
 *
 * Plan reference: `apps/backend/src/modules/products/labels/labels.controller.ts`.
 * Routes:
 *   - `GET  /api/products/labels/templates`              — list the exact 3 templates.
 *   - `POST /api/products/labels/preview`                — returns the PDF buffer inline
 *     (controller sets `Content-Type: application/pdf`).
 *   - `POST /api/products/labels/queue`                 — enqueues a job and returns the id.
 *   - `GET  /api/products/labels/queue/:id`              — job status.
 */

@ApiTags('products')
@ApiBearerAuth()
@Controller('products/labels')
export class LabelsController {
    constructor(
        private readonly labelsService: LabelsService,
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
    ) {}

    @Get('templates')
    @ApiOperation({ summary: 'List the supported label template names' })
    templates(): readonly LabelTemplate[] {
        return this.labelsService.listTemplates();
    }

    @Post('preview')
    @HttpCode(200)
    @Header('Content-Type', 'application/pdf')
    @ApiOperation({ summary: 'Render a preview PDF for the given products' })
    async preview(
        @Body() body: { template: LabelTemplate; products?: string[]; items?: ApparelLabelItem[] },
        @Res({ passthrough: false }) res: Response,
    ): Promise<void> {
        const template = this.assertTemplate(body?.template);
        let pdf: Buffer;
        if (body?.items && body.items.length > 0) {
            pdf = await this.labelsService.buildApparelLabelsPdf(template, body.items);
        } else {
            const products = await this.loadProducts(body?.products ?? []);
            pdf = await this.labelsService.buildPreviewPdf(template, products);
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `inline; filename="labels-${template}-${Date.now()}.pdf"`,
        );
        res.send(pdf);
    }

    @Post('queue')
    @HttpCode(202)
    @ApiOperation({ summary: 'Enqueue a label print job' })
    async queue(
        @Body() body: { template: LabelTemplate; products: string[] },
    ) {
        const template = this.assertTemplate(body?.template);
        const products = await this.loadProducts(body?.products ?? []);
        return this.labelsService.enqueue(template, products);
    }

    @Get('queue/:id')
    @ApiOperation({ summary: 'Fetch the status of an enqueued label job' })
    status(@Param('id') id: string) {
        return this.labelsService.status(id) ?? null;
    }

    private assertTemplate(value: string): LabelTemplate {
        if (!LABEL_TEMPLATE_NAMES.includes(value as LabelTemplate)) {
            throw new Error(
                `Unknown template "${value}". Allowed: ${LABEL_TEMPLATE_NAMES.join(', ')}`,
            );
        }
        return value as LabelTemplate;
    }

    private async loadProducts(ids: string[]): Promise<Product[]> {
        if (ids.length === 0) return [];
        const products = await this.productRepo.findByIds(ids);
        if (products.length === 0) {
            throw new Error(`No products found for ids: ${ids.join(', ')}`);
        }
        return products;
    }
}