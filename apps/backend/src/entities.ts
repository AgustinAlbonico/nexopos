// Archivo que exporta todas las entidades para uso con webpack bundle
// TypeORM necesita referencias explícitas en lugar de patrones glob cuando se bundlea

// Audit
import { AuditLog } from './modules/audit/entities/audit-log.entity';

// Auth
import { LoginAudit } from './modules/auth/entities/login-audit.entity';
import { RefreshToken } from './modules/auth/entities/refresh-token.entity';
import { User } from './modules/auth/entities/user.entity';

// Backup
import { Backup } from './modules/backup/entities/backup.entity';

// Cash Register
import { CashMovement } from './modules/cash-register/entities/cash-movement.entity';
import { CashRegisterTotals } from './modules/cash-register/entities/cash-register-totals.entity';
import { CashRegister } from './modules/cash-register/entities/cash-register.entity';

// Configuration
import { FiscalConfiguration } from './modules/configuration/entities/fiscal-configuration.entity';
import { PaymentMethod } from './modules/configuration/entities/payment-method.entity';
import { SystemConfiguration } from './modules/configuration/entities/system-configuration.entity';
import { TaxType } from './modules/configuration/entities/tax-type.entity';

// Customer Accounts
import { AccountMovement } from './modules/customer-accounts/entities/account-movement.entity';
import { CustomerAccount } from './modules/customer-accounts/entities/customer-account.entity';

// Customers
import { CustomerCategory } from './modules/customers/entities/customer-category.entity';
import { Customer } from './modules/customers/entities/customer.entity';

// Expenses
import { ExpenseCategory } from './modules/expenses/entities/expense-category.entity';
import { Expense } from './modules/expenses/entities/expense.entity';

// Incomes
import { IncomeCategory } from './modules/incomes/entities/income-category.entity';
import { Income } from './modules/incomes/entities/income.entity';

// Inventory
import { Location } from './modules/inventory/entities/location.entity';
import { ProductLocationStock } from './modules/inventory/entities/product-location-stock.entity';
import { StockMovement } from './modules/inventory/entities/stock-movement.entity';
import { StockTransfer } from './modules/inventory/entities/stock-transfer.entity';
import { StocktakeSession } from './modules/inventory/entities/stocktake-session.entity';
import { StocktakeLine } from './modules/inventory/entities/stocktake-line.entity';

// Products
import { Category } from './modules/products/entities/category.entity';
import { Product } from './modules/products/entities/product.entity';
import { Brand } from './modules/products/entities/brand.entity';
import { UnitOfMeasure } from './modules/products/entities/unit-of-measure.entity';
import { ProductPack } from './modules/products/entities/product-pack.entity';
import { ProductBundle } from './modules/products/entities/product-bundle.entity';
import { ProductVariantAttribute } from './modules/products/entities/product-variant-attribute.entity';

// Purchases
import { PurchaseItem } from './modules/purchases/entities/purchase-item.entity';
import { Purchase } from './modules/purchases/entities/purchase.entity';

// Sales
import { Invoice } from './modules/sales/entities/invoice.entity';
import { CreditNote } from './modules/sales/entities/credit-note.entity';
import { SaleItem } from './modules/sales/entities/sale-item.entity';
import { SalePayment } from './modules/sales/entities/sale-payment.entity';
import { SaleReturnItem } from './modules/sales/entities/sale-return-item.entity';
import { SaleReturn } from './modules/sales/entities/sale-return.entity';
import { SaleTax } from './modules/sales/entities/sale-tax.entity';
import { Sale } from './modules/sales/entities/sale.entity';

// Suppliers
import { Supplier } from './modules/suppliers/entities/supplier.entity';

// Array con todas las entidades
export const entities = [
    AuditLog,
    LoginAudit,
    RefreshToken,
    User,
    Backup,
    CashMovement,
    CashRegisterTotals,
    CashRegister,
    FiscalConfiguration,
    PaymentMethod,
    SystemConfiguration,
    TaxType,
    AccountMovement,
    CustomerAccount,
    CustomerCategory,
    Customer,
    ExpenseCategory,
    Expense,
    IncomeCategory,
    Income,
    Location,
    ProductLocationStock,
    StockMovement,
    StockTransfer,
    StocktakeSession,
    StocktakeLine,
    Category,
    Product,
    Brand,
    UnitOfMeasure,
    ProductPack,
    ProductBundle,
    ProductVariantAttribute,
    PurchaseItem,
    Purchase,
    Invoice,
    CreditNote,
    SaleItem,
    SalePayment,
    SaleReturnItem,
    SaleReturn,
    SaleTax,
    Sale,
    Supplier,
];
