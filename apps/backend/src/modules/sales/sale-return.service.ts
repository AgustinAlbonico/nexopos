import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Sale } from './entities/sale.entity';
import { CreateSaleReturnDto } from './dto/create-sale-return.dto';
import {
    SALE_RETURN_ITEM_DISPOSITIONS,
    SaleReturnItem,
} from './entities/sale-return-item.entity';
import { SaleReturn } from './entities/sale-return.entity';
import { InventoryService } from '../inventory/inventory.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { CustomerAccountsService } from '../customer-accounts/customer-accounts.service';
import { StockMovementSource, StockMovementType } from '../inventory/entities/stock-movement.entity';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { CreditNoteService } from './services/credit-note.service';

type SaleWithCashSession = Sale & { readonly cashRegisterSessionId?: string | null };

@Injectable()
export class SaleReturnService {
 constructor(
        @InjectRepository(Sale)
        private readonly saleRepo: Repository<SaleWithCashSession>,
        @InjectRepository(SaleReturn)
        private readonly returnRepo: Repository<SaleReturn>,
        @InjectRepository(SaleReturnItem)
        private readonly returnItemRepo: Repository<SaleReturnItem>,
        private readonly dataSource: DataSource,
        private readonly inventoryService: InventoryService,
        private readonly cashRegisterService: CashRegisterService,
        private readonly customerAccountsService: CustomerAccountsService,
        private readonly pdfGeneratorService: PdfGeneratorService,
        private readonly creditNoteService: CreditNoteService,
    ) { }

    async create(dto: CreateSaleReturnDto): Promise<SaleReturn> {
        if (dto.items.length === 0) {
            throw new BadRequestException('La devolución debe incluir al menos un item');
        }

        const sale = await this.saleRepo.findOne({
            where: { id: dto.originalSaleId },
            relations: ['items', 'customer'],
        });
        if (!sale) {
            throw new NotFoundException('Venta original no encontrada');
        }

        const itemsById = new Map(sale.items.map((item) => [item.id, item]));
        const returnedByItemId = await this.getReturnedQuantities(dto.originalSaleId);
        const returnItems = dto.items.map((item) => {
            if (item.quantityReturned <= 0) {
                throw new BadRequestException('La cantidad devuelta debe ser mayor a cero');
            }
            if (!SALE_RETURN_ITEM_DISPOSITIONS.includes(item.disposition)) {
                throw new BadRequestException('Disposición de devolución inválida');
            }

            const originalItem = itemsById.get(item.originalSaleItemId);
            if (!originalItem) {
                throw new NotFoundException('Item de venta original no encontrado');
            }

            const alreadyReturned = returnedByItemId.get(item.originalSaleItemId) ?? 0;
            const nextReturned = alreadyReturned + item.quantityReturned;
            if (nextReturned > originalItem.quantity) {
                throw new BadRequestException('La devolución supera la cantidad neta vendida');
            }
            returnedByItemId.set(item.originalSaleItemId, nextReturned);

            return this.returnItemRepo.create({
                originalSaleItemId: item.originalSaleItemId,
                quantityReturned: item.quantityReturned,
                unitRefundAmount: item.unitRefundAmount,
                disposition: item.disposition,
                taxSnapshot: item.taxSnapshot ?? null,
                capabilitySnapshot: item.capabilitySnapshot ?? null,
            });
        });

        const saleReturn = this.returnRepo.create({
            originalSaleId: sale.id,
            customerId: sale.customerId,
            cashRegisterSessionId: sale.cashRegisterSessionId ?? null,
            totalRefund: dto.totalRefund ?? 0,
            totalExchangeAmount: dto.totalExchangeAmount ?? 0,
            refundPayments: dto.refundPayments ?? null,
            status: 'draft',
            committedAt: null,
            items: returnItems,
        });

        return this.returnRepo.save(saleReturn);
    }

    async preview(dto: CreateSaleReturnDto): Promise<{ totalRefund: number; totalExchangeAmount: number; items: CreateSaleReturnDto['items'] }> {
        await this.assertReturnable(dto);
        return {
            totalRefund: dto.totalRefund ?? dto.items.reduce((sum, item) => sum + item.quantityReturned * item.unitRefundAmount, 0),
            totalExchangeAmount: dto.totalExchangeAmount ?? 0,
            items: dto.items,
        };
    }

    async commit(returnId: string, userId?: string): Promise<SaleReturn> {
        const { committedReturn, sale } = await this.dataSource.transaction(async (manager) => {
            const saleReturn = await manager
                .createQueryBuilder(SaleReturn, 'saleReturn')
                .leftJoinAndSelect('saleReturn.items', 'returnItems')
                .setLock('pessimistic_write')
                .where('saleReturn.id = :returnId', { returnId })
                .getOne();
            if (!saleReturn) {
                throw new NotFoundException('Devolución no encontrada');
            }
            if (saleReturn.status !== 'draft') {
                throw new BadRequestException('Solo se pueden confirmar devoluciones en borrador');
            }

            const sale = await manager
                .createQueryBuilder(Sale, 'sale')
                .leftJoinAndSelect('sale.items', 'items')
                .leftJoinAndSelect('sale.payments', 'payments')
                .leftJoinAndSelect('sale.invoice', 'invoice')
                .setLock('pessimistic_write')
                .where('sale.id = :saleId', { saleId: saleReturn.originalSaleId })
                .getOne();
            if (!sale) {
                throw new NotFoundException('Venta original no encontrada');
            }

            const items = saleReturn.items ?? [];
            const saleItems = new Map((sale.items ?? []).map((item) => [item.id, item]));
            const returnedByItemId = this.sumReturnedQuantities(await manager.find(SaleReturn, {
                where: { originalSaleId: sale.id },
                relations: ['items'],
            }), returnId);
            for (const item of items) {
                const originalItem = saleItems.get(item.originalSaleItemId);
                if (!originalItem) {
                    throw new NotFoundException('Item de venta original no encontrado');
                }
                if ((returnedByItemId.get(item.originalSaleItemId) ?? 0) + Number(item.quantityReturned) > Number(originalItem.quantity)) {
                    throw new BadRequestException('La devolución supera la cantidad neta vendida');
                }
                if (item.disposition === 'restock') {
                    const returnRatio = Number(item.quantityReturned) / Number(originalItem.quantity);
                    const effects = originalItem.inventoryEffects ?? [{ productId: originalItem.productId, quantity: Number(originalItem.quantity) }];
                    for (const effect of effects) {
                        await this.inventoryService.recordMovementInLocation({
                            productId: effect.productId,
                            type: StockMovementType.IN,
                            source: StockMovementSource.RETURN,
                            quantity: Number(effect.quantity) * returnRatio,
                            notes: `Devolución ${returnId}`,
                            manager,
                        });
                    }
                }
            }

            await this.applyRefundEffects(sale, saleReturn, userId, manager);
            saleReturn.status = 'committed';
            saleReturn.committedAt = new Date();
            return { committedReturn: await manager.save(saleReturn), sale };
        });
        if (sale.isFiscal && sale.invoice) {
            await this.creditNoteService.authorizeReturn({
                saleReturn: committedReturn,
                originalInvoice: sale.invoice,
                userId: userId ?? 'system',
            });
        }
        return committedReturn;
    }

    async cancel(returnId: string): Promise<SaleReturn> {
        const saleReturn = await this.returnRepo.findOne({ where: { id: returnId }, relations: ['items'] });
        if (!saleReturn) {
            throw new NotFoundException('Devolución no encontrada');
        }
        if (saleReturn.status !== 'draft') {
            throw new BadRequestException('Solo se pueden cancelar devoluciones en borrador');
        }
        saleReturn.status = 'cancelled';
        return this.returnRepo.save(saleReturn);
    }

    findByOriginalSale(originalSaleId: string): Promise<SaleReturn[]> {
        return this.returnRepo.find({
            where: { originalSaleId },
            relations: ['items'],
            order: { createdAt: 'DESC' },
        });
    }

    async renderReceiptPdf(returnId: string): Promise<Buffer> {
        const saleReturn = await this.returnRepo.findOne({
            where: { id: returnId },
            relations: ['items', 'originalSale', 'originalSale.items', 'originalSale.customer', 'originalSale.payments', 'originalSale.payments.paymentMethod'],
        });
        if (!saleReturn) {
            throw new NotFoundException('Devolución no encontrada');
        }
        return this.pdfGeneratorService.generateSaleReturnReceiptPdf(saleReturn);
    }

    private async assertReturnable(dto: CreateSaleReturnDto): Promise<void> {
        const sale = await this.saleRepo.findOne({
            where: { id: dto.originalSaleId },
            relations: ['items', 'customer'],
        });
        if (!sale) {
            throw new NotFoundException('Venta original no encontrada');
        }
        this.assertItemsReturnable(sale, dto.items, await this.getReturnedQuantities(dto.originalSaleId));
    }

    private assertItemsReturnable(sale: Pick<Sale, 'items'>, items: CreateSaleReturnDto['items'], returnedByItemId: Map<string, number>): void {
        if (items.length === 0) {
            throw new BadRequestException('La devolución debe incluir al menos un item');
        }
        const itemsById = new Map(sale.items.map((item) => [item.id, item]));
        for (const item of items) {
            if (item.quantityReturned <= 0) {
                throw new BadRequestException('La cantidad devuelta debe ser mayor a cero');
            }
            if (!SALE_RETURN_ITEM_DISPOSITIONS.includes(item.disposition)) {
                throw new BadRequestException('Disposición de devolución inválida');
            }
            const originalItem = itemsById.get(item.originalSaleItemId);
            if (!originalItem) {
                throw new NotFoundException('Item de venta original no encontrado');
            }
            const nextReturned = (returnedByItemId.get(item.originalSaleItemId) ?? 0) + item.quantityReturned;
            if (nextReturned > originalItem.quantity) {
                throw new BadRequestException('La devolución supera la cantidad neta vendida');
            }
            returnedByItemId.set(item.originalSaleItemId, nextReturned);
        }
    }

    private sumReturnedQuantities(returns: SaleReturn[], excludeReturnId?: string): Map<string, number> {
        const quantities = new Map<string, number>();
        for (const saleReturn of returns) {
            if ((excludeReturnId && saleReturn.id === excludeReturnId) || saleReturn.status !== 'committed') {
                continue;
            }
            for (const item of saleReturn.items) {
                quantities.set(item.originalSaleItemId, (quantities.get(item.originalSaleItemId) ?? 0) + Number(item.quantityReturned));
            }
        }
        return quantities;
    }

    private async applyRefundEffects(sale: Sale, saleReturn: SaleReturn, userId: string | undefined, manager: EntityManager): Promise<void> {
        const amount = Number(saleReturn.totalRefund ?? 0);
        if (amount <= 0) return;
        if (sale.isOnAccount && sale.customerId) {
            await this.customerAccountsService.createAdjustmentWithManager(sale.customerId, {
                amount: -amount,
                description: `Devolución venta ${sale.saleNumber}`,
                referenceType: 'sale_return',
                referenceId: saleReturn.id,
            }, userId, manager);
            return;
        }

        // Caso 1: Se especificaron desgloses explícitos por medio de pago (C2 / #37)
        if (saleReturn.refundPayments && saleReturn.refundPayments.length > 0) {
            for (const payment of saleReturn.refundPayments) {
                await this.cashRegisterService.registerRefundWithManager({
                    amount: payment.amount,
                    paymentMethodId: payment.paymentMethodId,
                    description: `Devolución venta ${sale.saleNumber}`,
                    referenceId: saleReturn.id,
                }, userId || 'system', manager);
            }
            return;
        }

        // Caso 2: Distribuir proporcionalmente entre todos los medios de pago de la venta original
        const payments = sale.payments ?? [];
        const totalOriginalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        if (totalOriginalPayments > 0 && payments.length > 0) {
            let remainingRefund = amount;
            for (let i = 0; i < payments.length; i++) {
                const payment = payments[i];
                const isLast = i === payments.length - 1;
                const ratio = Number(payment.amount) / totalOriginalPayments;
                const refundForMethod = isLast
                    ? Math.round(remainingRefund * 100) / 100
                    : Math.round(amount * ratio * 100) / 100;
                remainingRefund -= refundForMethod;

                if (refundForMethod > 0 && payment.paymentMethodId) {
                    await this.cashRegisterService.registerRefundWithManager({
                        amount: refundForMethod,
                        paymentMethodId: payment.paymentMethodId,
                        description: `Devolución proporcional venta ${sale.saleNumber}`,
                        referenceId: saleReturn.id,
                    }, userId || 'system', manager);
                }
            }
            return;
        }

        // Caso 3: Fallback a primer medio si existiese
        const payment = payments[0];
        if (payment?.paymentMethodId) {
            await this.cashRegisterService.registerRefundWithManager({
                amount,
                paymentMethodId: payment.paymentMethodId,
                description: `Devolución venta ${sale.saleNumber}`,
                referenceId: saleReturn.id,
            }, userId || 'system', manager);
        }
    }

    private async getReturnedQuantities(originalSaleId: string): Promise<Map<string, number>> {
        const returns = await this.returnRepo.find({
            where: { originalSaleId },
            relations: ['items'],
        });
        return this.sumReturnedQuantities(returns);
    }
}
