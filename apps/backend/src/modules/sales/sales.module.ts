/**
 * Módulo de Ventas
 * Configura el módulo de ventas con sus dependencias
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SalePayment } from './entities/sale-payment.entity';
import { SaleTax } from './entities/sale-tax.entity';
import { SaleReturn } from './entities/sale-return.entity';
import { SaleReturnItem } from './entities/sale-return-item.entity';
import { Invoice } from './entities/invoice.entity';
import { CreditNote } from './entities/credit-note.entity';
import { ProductPack } from '../products/entities/product-pack.entity';
import { ProductBundle } from '../products/entities/product-bundle.entity';
import { SaleReturnController } from './sale-return.controller';
import { SaleReturnService } from './sale-return.service';
import { CreditNoteService } from './services/credit-note.service';
import { InventoryModule } from '../inventory/inventory.module';
import { ProductsModule } from '../products/products.module';
// ConfigurationModule es @Global(), no necesita importarse
// Servicios de facturación
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './services/invoice.service';
import { AfipService } from './services/afip.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { QrGeneratorService } from './services/qr-generator.service';
import { CashRegisterModule } from '../cash-register/cash-register.module';
import { CustomerAccountsModule } from '../customer-accounts/customer-accounts.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Sale, SaleItem, SalePayment, SaleTax, SaleReturn, SaleReturnItem, Invoice, CreditNote, ProductPack, ProductBundle]),
        InventoryModule,
        ProductsModule,
        CashRegisterModule,
        CustomerAccountsModule, // Para registrar ventas en cuenta corriente
        // ConfigurationModule es @Global(), no necesita importarse explícitamente
    ],
    controllers: [SalesController, SaleReturnController, InvoiceController],
    providers: [
        SalesService,
        SaleReturnService,
        CreditNoteService,
        InvoiceService,
        AfipService,
        PdfGeneratorService,
        QrGeneratorService,
    ],
    exports: [SalesService, SaleReturnService, CreditNoteService, InvoiceService, AfipService],
})
export class SalesModule { }

