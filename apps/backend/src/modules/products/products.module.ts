import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { Product } from './entities/product.entity';
import { ProductPack } from './entities/product-pack.entity';
import { ProductBundle } from './entities/product-bundle.entity';
import { ProductVariantAttribute } from './entities/product-variant-attribute.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { Category } from './entities/category.entity';
import { ConfigurationModule } from '../configuration/configuration.module';
import { InventoryModule } from '../inventory/inventory.module';

import { Brand } from './entities/brand.entity';
import { SizeScaleTemplate } from './entities/size-scale-template.entity';
import { ColorPaletteTemplate } from './entities/color-palette-template.entity';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { BrandsRepository } from './brands.repository';

import { ImportController } from './import/import.controller';
import { ImportService } from './import/import.service';
import { ImportPreviewCache } from './import/preview-cache';
import { LabelsController } from './labels/labels.controller';
import { LabelsService } from './labels/labels.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Product,
            ProductPack,
            ProductBundle,
            ProductVariantAttribute,
            Category,
            Brand,
            SizeScaleTemplate,
            ColorPaletteTemplate,
        ]),
        ConfigurationModule,
        forwardRef(() => InventoryModule),
    ],
    controllers: [ProductsController, CategoriesController, BrandsController, ImportController, LabelsController],
    providers: [
        ProductsService,
        ProductsRepository,
        CategoriesService,
        CategoriesRepository,
        BrandsService,
        BrandsRepository,
        ImportService,
        ImportPreviewCache,
        LabelsService,
    ],
    exports: [ProductsService, CategoriesService, BrandsService],
})
export class ProductsModule { }
