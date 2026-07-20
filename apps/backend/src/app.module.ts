import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SalesModule } from './modules/sales/sales.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { CustomerAccountsModule } from './modules/customer-accounts/customer-accounts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { IncomesModule } from './modules/incomes/incomes.module';
import { AuditModule } from './modules/audit/audit.module';
import { BackupModule } from './modules/backup/backup.module';
import { entities } from './entities';
import { migrations } from './migrations';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST'),
        port: config.get('DATABASE_PORT'),
        username: config.get('DATABASE_USER'),
        password: config.get('DATABASE_PASSWORD'),
        database: config.get('DATABASE_NAME'),
        // Cargar entidades explícitamente para el bundle
        entities: entities,
        // Usar migraciones en producción (no synchronize)
        synchronize: false,
        // Cargar migraciones explícitamente para el bundle
        migrations: migrations,
        // Ejecutar migraciones automáticamente al iniciar
        migrationsRun: true,
        migrationsTransactionMode: 'each',
        logging: false,
      }),
    }),
    AuthModule,
    ProductsModule,
    ConfigurationModule,
    InventoryModule,
    CustomersModule,
    ExpensesModule,
    SuppliersModule,
    PurchasesModule,
    SalesModule,
    CashRegisterModule,
    CustomerAccountsModule,
    ReportsModule,
    IncomesModule,
    AuditModule,
    BackupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
