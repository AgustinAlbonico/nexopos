import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { Product } from './entities/product.entity';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { Category } from './entities/category.entity';
import { ConfigurationModule } from '../configuration/configuration.module';
import { InventoryModule } from '../inventory/inventory.module';

import { Brand } from './entities/brand.entity';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { BrandsRepository } from './brands.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([Product, Category, Brand]),
        ConfigurationModule,
        forwardRef(() => InventoryModule),
    ],
    controllers: [
        ProductsController,
        CategoriesController,
        BrandsController,
    ],
    providers: [
        ProductsService,
        ProductsRepository,
        CategoriesService,
        CategoriesRepository,
        BrandsService,
        BrandsRepository,
    ],
    exports: [
        ProductsService,
        CategoriesService,
        BrandsService,
    ],
})
export class ProductsModule { }
