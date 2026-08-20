import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ActivationService } from './activation.service';
import { StocktakeController } from './stocktake.controller';
import { StocktakeService } from './stocktake.service';
import { StockMovement } from './entities/stock-movement.entity';
import { Location } from './entities/location.entity';
import { ProductLocationStock } from './entities/product-location-stock.entity';
import { StockTransfer } from './entities/stock-transfer.entity';
import { StocktakeSession } from './entities/stocktake-session.entity';
import { StocktakeLine } from './entities/stocktake-line.entity';
import { Product } from '../products/entities/product.entity';
import { SystemConfiguration } from '../configuration/entities/system-configuration.entity';
import { ConfigurationModule } from '../configuration/configuration.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            StockMovement,
            Location,
            ProductLocationStock,
            StockTransfer,
            StocktakeSession,
            StocktakeLine,
            Product,
            SystemConfiguration,
        ]),
        ConfigurationModule,
    ],
    controllers: [InventoryController, StocktakeController],
    providers: [InventoryService, ActivationService, StocktakeService],
    exports: [InventoryService, ActivationService, StocktakeService],
})
export class InventoryModule { }
