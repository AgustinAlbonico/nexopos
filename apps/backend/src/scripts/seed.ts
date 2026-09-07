/**
 * Script de seed COMPLETO para poblar la base de datos con datos históricos
 * Incluye datos de los últimos 12 meses para un negocio de belleza, marroquinería y accesorios
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'node:path';
import * as bcrypt from 'bcryptjs';

// Entidades
import { User } from '../modules/auth/entities/user.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { LoginAudit } from '../modules/auth/entities/login-audit.entity';
import { Category } from '../modules/products/entities/category.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Brand } from '../modules/products/entities/brand.entity';
import { SystemConfiguration } from '../modules/configuration/entities/system-configuration.entity';
import { FiscalConfiguration } from '../modules/configuration/entities/fiscal-configuration.entity';
import { TaxType } from '../modules/configuration/entities/tax-type.entity';
import { CustomerCategory } from '../modules/customers/entities/customer-category.entity';
import { Customer, DocumentType as CustomerDocType } from '../modules/customers/entities/customer.entity';
import { IvaCondition } from '../common/enums/iva-condition.enum';
import { ExpenseCategory } from '../modules/expenses/entities/expense-category.entity';
import { Expense } from '../modules/expenses/entities/expense.entity';
import { PaymentMethod as PaymentMethodEntity } from '../modules/configuration/entities/payment-method.entity';
import { Supplier, DocumentType as SupplierDocType } from '../modules/suppliers/entities/supplier.entity';
import { Purchase, PurchaseStatus } from '../modules/purchases/entities/purchase.entity';
import { PurchaseItem } from '../modules/purchases/entities/purchase-item.entity';
import { IncomeCategory } from '../modules/incomes/entities/income-category.entity';
import { Income } from '../modules/incomes/entities/income.entity';
import { Sale, SaleStatus } from '../modules/sales/entities/sale.entity';
import { SaleItem } from '../modules/sales/entities/sale-item.entity';
import { SalePayment } from '../modules/sales/entities/sale-payment.entity';
import { SaleTax } from '../modules/sales/entities/sale-tax.entity';
import { Invoice } from '../modules/sales/entities/invoice.entity';
import { StockMovement, StockMovementType, StockMovementSource } from '../modules/inventory/entities/stock-movement.entity';
import { CashRegister } from '../modules/cash-register/entities/cash-register.entity';
import { CashMovement } from '../modules/cash-register/entities/cash-movement.entity';
import { CashRegisterTotals } from '../modules/cash-register/entities/cash-register-totals.entity';
import { CustomerAccount } from '../modules/customer-accounts/entities/customer-account.entity';
import { AccountMovement, MovementType } from '../modules/customer-accounts/entities/account-movement.entity';
import { parseLocalDate, formatDateLocal } from '../common/utils/date.utils';

// Cargar variables de entorno
config({ path: path.resolve(__dirname, '../../../../.env') });

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number.parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sistema_gestion',
    entities: [
        User, RefreshToken, LoginAudit,
        Category, Product, Brand,
        SystemConfiguration, FiscalConfiguration, TaxType, PaymentMethodEntity,
        CustomerCategory, Customer, CustomerAccount, AccountMovement,
        ExpenseCategory, Expense,
        IncomeCategory, Income,
        Supplier, Purchase, PurchaseItem,
        Sale, SaleItem, SalePayment, SaleTax, Invoice,
        StockMovement,
        CashRegister, CashMovement, CashRegisterTotals,
    ],
    synchronize: true,
    dropSchema: true,
});

// === HELPERS ===
function getDateDaysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return formatDateLocal(date);
}

function getTimestampDaysAgo(days: number, hours = 10, minutes = 0): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
    try {
        console.log('🌱 Iniciando seed COMPLETO de base de datos...');
        await dataSource.initialize();
        console.log('✅ Conexión a base de datos establecida.');

        // === REPOSITORIOS ===
        const userRepo = dataSource.getRepository(User);
        const configRepo = dataSource.getRepository(SystemConfiguration);
        const taxTypeRepo = dataSource.getRepository(TaxType);
        const categoryRepo = dataSource.getRepository(Category);
        const productRepo = dataSource.getRepository(Product);
        const customerCategoryRepo = dataSource.getRepository(CustomerCategory);
        const customerRepo = dataSource.getRepository(Customer);
        const expenseCategoryRepo = dataSource.getRepository(ExpenseCategory);
        const expenseRepo = dataSource.getRepository(Expense);
        const paymentMethodRepo = dataSource.getRepository(PaymentMethodEntity);
        const supplierRepo = dataSource.getRepository(Supplier);
        const purchaseRepo = dataSource.getRepository(Purchase);
        const purchaseItemRepo = dataSource.getRepository(PurchaseItem);
        const incomeCategoryRepo = dataSource.getRepository(IncomeCategory);
        const incomeRepo = dataSource.getRepository(Income);
        const saleRepo = dataSource.getRepository(Sale);
        const saleItemRepo = dataSource.getRepository(SaleItem);
        const salePaymentRepo = dataSource.getRepository(SalePayment);
        const stockMovementRepo = dataSource.getRepository(StockMovement);
        const customerAccountRepo = dataSource.getRepository(CustomerAccount);
        const accountMovementRepo = dataSource.getRepository(AccountMovement);

        // === 1. USUARIO ADMIN ===
        // Usamos query directa para evitar que el hook @BeforeInsert vuelva a hashear
        const passwordHash = await bcrypt.hash('Admin123', 10);
        const existingAdmin = await userRepo.findOne({ where: { username: 'admin' } });
        let adminUser;
        if (existingAdmin) {
            // Actualizar contraseña del admin existente
            await dataSource.query(
                `UPDATE users SET "passwordHash" = $1 WHERE username = $2`,
                [passwordHash, 'admin']
            );
            adminUser = existingAdmin;
        } else {
            // Insertar nuevo admin con query directa para evitar el hook
            const result = await dataSource.query(
                `INSERT INTO users (username, email, "passwordHash", "firstName", "lastName", "isActive") 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                ['admin', 'admin@admin.com', passwordHash, 'Agustín', 'Albónico', true]
            );
            adminUser = { id: result[0].id, username: 'admin' };
        }
        console.log('✅ Usuario admin creado/actualizado (admin / Admin123)');

        // === 2. CONFIGURACIÓN DEL SISTEMA ===
        await configRepo.save(configRepo.create({ defaultProfitMargin: 30, minStockAlert: 5 }));
        console.log('✅ Configuración del sistema creada');

        // === 2.1 CONFIGURACIÓN FISCAL ===
        const fiscalConfigRepo = dataSource.getRepository(FiscalConfiguration);
        const existingFiscalConfig = await fiscalConfigRepo.findOne({ where: {} });
        if (!existingFiscalConfig) {
            await fiscalConfigRepo.save(fiscalConfigRepo.create({
                businessName: 'Mi Negocio',
                cuit: '20123456789',
                ivaCondition: IvaCondition.RESPONSABLE_MONOTRIBUTO,
                pointOfSale: 1,
                isConfigured: false,
            }));
            console.log('✅ Configuración fiscal inicializada');
        } else {
            console.log('✅ Configuración fiscal ya existe');
        }

        // === 3. TIPOS DE IMPUESTOS ===
        const taxTypesData = [
            { name: 'IVA 21%', percentage: 21, description: 'IVA General' },
            { name: 'IVA 10.5%', percentage: 10.5, description: 'IVA Reducido' },
            { name: 'IVA 27%', percentage: 27, description: 'IVA Servicios Públicos' },
            { name: 'IVA 0% (Exento)', percentage: 0, description: 'Exento de IVA' },
        ];
        for (const t of taxTypesData) await taxTypeRepo.save(taxTypeRepo.create(t));
        console.log(`✅ ${taxTypesData.length} tipos de impuestos creados`);

        // === 4. MÉTODOS DE PAGO ===
        const paymentMethodsData = [
            { name: 'Efectivo', code: 'cash', isActive: true },
            { name: 'Transferencia', code: 'transfer', isActive: true },
            { name: 'Tarjeta de Débito', code: 'debit_card', isActive: true },
            { name: 'Tarjeta de Crédito', code: 'credit_card', isActive: true },
            { name: 'QR / Billetera Virtual', code: 'qr', isActive: true },
            { name: 'Cheque', code: 'check', isActive: true },
        ];
        const paymentMethodsMap: Record<string, PaymentMethodEntity> = {};
        for (const pm of paymentMethodsData) {
            const saved = await paymentMethodRepo.save(paymentMethodRepo.create(pm));
            paymentMethodsMap[pm.code] = saved;
        }
        console.log(`✅ ${paymentMethodsData.length} métodos de pago creados`);

        // === 5. CATEGORÍAS DE PRODUCTOS ===
        const categoriesData = [
            { name: 'Maquillaje', description: 'Bases, labiales, sombras, rubores', color: '#ec4899', profitMargin: 35 },
            { name: 'Cuidado Facial', description: 'Cremas, serums, limpiadores', color: '#f59e0b', profitMargin: 40 },
            { name: 'Cuidado Capilar', description: 'Shampoos, acondicionadores', color: '#8b5cf6', profitMargin: 30 },
            { name: 'Perfumería', description: 'Perfumes, colonias', color: '#06b6d4', profitMargin: 45 },
            { name: 'Uñas', description: 'Esmaltes, removedores', color: '#ef4444', profitMargin: 50 },
            { name: 'Carteras', description: 'Carteras, billeteras', color: '#6366f1', profitMargin: 40 },
            { name: 'Bolsos', description: 'Bolsos, mochilas', color: '#14b8a6', profitMargin: 35 },
            { name: 'Cinturones', description: 'Cinturones de cuero', color: '#a855f7', profitMargin: 40 },
            { name: 'Accesorios', description: 'Llaveros, tarjeteros', color: '#f97316', profitMargin: 50 },
            { name: 'Joyería', description: 'Aros, collares, pulseras', color: '#eab308', profitMargin: 60 },
            { name: 'Relojes', description: 'Relojes de pulsera', color: '#3b82f6', profitMargin: 45 },
        ];
        const categories: Category[] = [];
        for (const c of categoriesData) {
            categories.push(await categoryRepo.save(categoryRepo.create(c)));
        }
        console.log(`✅ ${categories.length} categorías de productos creadas`);

        // === 6. PRODUCTOS (50+ productos) ===
        const productsData = [
            // Maquillaje (0)
            { name: 'Base Líquida Natural Beige', cost: 4500, stock: 25, category: categories[0], sku: 'MAQ-001' },
            { name: 'Labial Mate Rojo Intenso', cost: 3200, stock: 40, category: categories[0], sku: 'MAQ-002' },
            { name: 'Paleta de Sombras 12 Colores', cost: 6800, stock: 15, category: categories[0], sku: 'MAQ-003' },
            { name: 'Rubor en Polvo Rosa', cost: 2800, stock: 30, category: categories[0], sku: 'MAQ-004' },
            { name: 'Máscara de Pestañas Waterproof', cost: 3500, stock: 35, category: categories[0], sku: 'MAQ-005' },
            { name: 'Delineador Líquido Negro', cost: 2400, stock: 45, category: categories[0], sku: 'MAQ-006' },
            { name: 'Corrector Alta Cobertura', cost: 2900, stock: 28, category: categories[0], sku: 'MAQ-007' },
            { name: 'Polvo Translúcido Compacto', cost: 3100, stock: 22, category: categories[0], sku: 'MAQ-008' },
            // Cuidado Facial (1)
            { name: 'Crema Hidratante Día SPF 30', cost: 5200, stock: 20, category: categories[1], sku: 'CF-001' },
            { name: 'Serum Vitamina C', cost: 7500, stock: 12, category: categories[1], sku: 'CF-002' },
            { name: 'Limpiador Facial Espumoso', cost: 3800, stock: 30, category: categories[1], sku: 'CF-003' },
            { name: 'Mascarilla Facial Arcilla', cost: 4200, stock: 25, category: categories[1], sku: 'CF-004' },
            { name: 'Tónico Facial Equilibrante', cost: 3600, stock: 28, category: categories[1], sku: 'CF-005' },
            { name: 'Crema Anti-edad Noche', cost: 6800, stock: 15, category: categories[1], sku: 'CF-006' },
            // Cuidado Capilar (2)
            { name: 'Shampoo Reparador 500ml', cost: 3200, stock: 40, category: categories[2], sku: 'CC-001' },
            { name: 'Acondicionador Hidratante 500ml', cost: 3200, stock: 40, category: categories[2], sku: 'CC-002' },
            { name: 'Mascarilla Capilar Nutritiva', cost: 4500, stock: 25, category: categories[2], sku: 'CC-003' },
            { name: 'Aceite Capilar Argan', cost: 4800, stock: 20, category: categories[2], sku: 'CC-004' },
            { name: 'Spray Termoprotector', cost: 2800, stock: 35, category: categories[2], sku: 'CC-005' },
            // Perfumería (3)
            { name: 'Perfume Mujer 50ml', cost: 12500, stock: 12, category: categories[3], sku: 'PERF-001' },
            { name: 'Perfume Hombre 50ml', cost: 12500, stock: 12, category: categories[3], sku: 'PERF-002' },
            { name: 'Colonia Unisex 100ml', cost: 6800, stock: 20, category: categories[3], sku: 'PERF-003' },
            { name: 'Desodorante Roll-on', cost: 1800, stock: 50, category: categories[3], sku: 'PERF-004' },
            // Uñas (4)
            { name: 'Esmalte Rojo Clásico', cost: 1200, stock: 60, category: categories[4], sku: 'UÑ-001' },
            { name: 'Esmalte Rosa Nude', cost: 1200, stock: 55, category: categories[4], sku: 'UÑ-002' },
            { name: 'Esmalte Azul Marino', cost: 1200, stock: 50, category: categories[4], sku: 'UÑ-003' },
            { name: 'Top Coat Brillante', cost: 1500, stock: 40, category: categories[4], sku: 'UÑ-004' },
            { name: 'Removedor de Esmalte 200ml', cost: 1800, stock: 35, category: categories[4], sku: 'UÑ-005' },
            // Carteras (5)
            { name: 'Cartera Cuero Negro', cost: 8500, stock: 15, category: categories[5], sku: 'CAR-001' },
            { name: 'Billetera Cuero Marrón', cost: 5200, stock: 20, category: categories[5], sku: 'CAR-002' },
            { name: 'Monedero Cuero Negro', cost: 3200, stock: 30, category: categories[5], sku: 'CAR-003' },
            { name: 'Cartera Sintética Rosa', cost: 4500, stock: 18, category: categories[5], sku: 'CAR-004' },
            { name: 'Tarjetero Cuero', cost: 2800, stock: 25, category: categories[5], sku: 'CAR-005' },
            // Bolsos (6)
            { name: 'Bolso Tote Cuero Negro', cost: 18500, stock: 8, category: categories[6], sku: 'BOL-001' },
            { name: 'Bolso Bandolera Cuero', cost: 15200, stock: 10, category: categories[6], sku: 'BOL-002' },
            { name: 'Mochila Cuero Marrón', cost: 22000, stock: 6, category: categories[6], sku: 'BOL-003' },
            { name: 'Cartera de Mano Sintética', cost: 6800, stock: 15, category: categories[6], sku: 'BOL-004' },
            { name: 'Bolso Crossbody Pequeño', cost: 9800, stock: 12, category: categories[6], sku: 'BOL-005' },
            // Cinturones (7)
            { name: 'Cinturón Cuero Negro 3cm', cost: 4500, stock: 25, category: categories[7], sku: 'CIN-001' },
            { name: 'Cinturón Cuero Marrón 4cm', cost: 5200, stock: 20, category: categories[7], sku: 'CIN-002' },
            { name: 'Cinturón Sintético Negro', cost: 2800, stock: 35, category: categories[7], sku: 'CIN-003' },
            // Accesorios (8)
            { name: 'Llavero Cuero con Logo', cost: 1800, stock: 50, category: categories[8], sku: 'ACC-001' },
            { name: 'Organizador de Tarjetas', cost: 2200, stock: 40, category: categories[8], sku: 'ACC-002' },
            { name: 'Porta Documentos Cuero', cost: 3800, stock: 20, category: categories[8], sku: 'ACC-003' },
            // Joyería (9)
            { name: 'Aros Dorados Círculo', cost: 3200, stock: 30, category: categories[9], sku: 'JOY-001' },
            { name: 'Collar Plata 45cm', cost: 5800, stock: 18, category: categories[9], sku: 'JOY-002' },
            { name: 'Pulsera Ajustable Plata', cost: 4200, stock: 22, category: categories[9], sku: 'JOY-003' },
            { name: 'Anillo Plata Talla 16', cost: 3800, stock: 15, category: categories[9], sku: 'JOY-004' },
            { name: 'Aros Perla Elegantes', cost: 4500, stock: 20, category: categories[9], sku: 'JOY-005' },
            // Relojes (10)
            { name: 'Reloj Analógico Cuero', cost: 12500, stock: 10, category: categories[10], sku: 'REL-001' },
            { name: 'Reloj Digital Deportivo', cost: 9800, stock: 12, category: categories[10], sku: 'REL-002' },
            { name: 'Reloj Elegante Dorado', cost: 15000, stock: 8, category: categories[10], sku: 'REL-003' },
        ];

        const products: Product[] = [];
        for (const p of productsData) {
            const margin = p.category.profitMargin ?? 30;
            const price = Math.round(p.cost * (1 + margin / 100) * 100) / 100;
            products.push(await productRepo.save(productRepo.create({
                ...p,
                price,
                profitMargin: margin,
                isActive: true,
            })));
        }
        console.log(`✅ ${products.length} productos creados`);

        // === 7. CATEGORÍAS DE CLIENTES ===
        const customerCategoriesData = [
            { name: 'VIP', description: 'Clientes frecuentes con descuentos especiales', color: '#fbbf24' },
            { name: 'Mayorista', description: 'Clientes que compran en grandes cantidades', color: '#3b82f6' },
            { name: 'Minorista', description: 'Clientes ocasionales', color: '#10b981' },
            { name: 'Online', description: 'Clientes que compran por internet', color: '#8b5cf6' },
        ];
        const customerCategories: CustomerCategory[] = [];
        for (const c of customerCategoriesData) {
            customerCategories.push(await customerCategoryRepo.save(customerCategoryRepo.create(c)));
        }
        console.log(`✅ ${customerCategories.length} categorías de clientes creadas`);

        // === 8. CLIENTES (20 clientes) ===
        const customersData = [
            { firstName: 'María', lastName: 'González', documentType: CustomerDocType.DNI, documentNumber: '12345678', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'maria.gonzalez@email.com', phone: '11-2345-6789', address: 'Av. Corrientes 1234', city: 'Buenos Aires', category: customerCategories[0] },
            { firstName: 'Juan', lastName: 'Pérez', documentType: CustomerDocType.DNI, documentNumber: '23456789', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'juan.perez@email.com', phone: '11-3456-7890', address: 'San Martín 567', city: 'Buenos Aires', category: customerCategories[1] },
            { firstName: 'Ana', lastName: 'Martínez', documentType: CustomerDocType.DNI, documentNumber: '34567890', ivaCondition: IvaCondition.RESPONSABLE_MONOTRIBUTO, email: 'ana.martinez@email.com', phone: '11-4567-8901', address: 'Rivadavia 890', city: 'Buenos Aires', category: customerCategories[2] },
            { firstName: 'Carlos', lastName: 'Rodríguez', documentType: CustomerDocType.CUIT, documentNumber: '20123456789', ivaCondition: IvaCondition.RESPONSABLE_INSCRIPTO, email: 'carlos.rodriguez@email.com', phone: '11-5678-9012', address: 'Florida 123', city: 'Buenos Aires', category: customerCategories[1] },
            { firstName: 'Laura', lastName: 'Fernández', documentType: CustomerDocType.DNI, documentNumber: '45678901', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'laura.fernandez@email.com', phone: '11-6789-0123', address: 'Cabildo 2345', city: 'Buenos Aires', category: customerCategories[0] },
            { firstName: 'Diego', lastName: 'López', documentType: CustomerDocType.DNI, documentNumber: '56789012', ivaCondition: IvaCondition.RESPONSABLE_MONOTRIBUTO, email: 'diego.lopez@email.com', phone: '11-7890-1234', address: 'Santa Fe 3456', city: 'Buenos Aires', category: customerCategories[3] },
            { firstName: 'Sofía', lastName: 'García', documentType: CustomerDocType.DNI, documentNumber: '67890123', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'sofia.garcia@email.com', phone: '11-8901-2345', address: 'Córdoba 4567', city: 'Buenos Aires', category: customerCategories[2] },
            { firstName: 'Martín', lastName: 'Sánchez', documentType: CustomerDocType.DNI, documentNumber: '78901234', ivaCondition: IvaCondition.EXENTO, email: 'martin.sanchez@email.com', phone: '11-9012-3456', address: 'Lavalle 5678', city: 'Buenos Aires', category: customerCategories[1] },
            { firstName: 'Valentina', lastName: 'Torres', documentType: CustomerDocType.DNI, documentNumber: '89012345', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'valentina.torres@email.com', phone: '11-0123-4567', address: 'Belgrano 6789', city: 'Buenos Aires', category: customerCategories[0] },
            { firstName: 'Lucas', lastName: 'Ramírez', documentType: CustomerDocType.DNI, documentNumber: '90123456', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'lucas.ramirez@email.com', phone: '11-1234-5678', address: 'Palermo 7890', city: 'Buenos Aires', category: customerCategories[3] },
            { firstName: 'Camila', lastName: 'Ruiz', documentType: CustomerDocType.DNI, documentNumber: '11223344', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'camila.ruiz@email.com', phone: '11-2233-4455', address: 'Recoleta 111', city: 'Buenos Aires', category: customerCategories[2] },
            { firstName: 'Nicolás', lastName: 'Moreno', documentType: CustomerDocType.DNI, documentNumber: '22334455', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'nicolas.moreno@email.com', phone: '11-3344-5566', address: 'Caballito 222', city: 'Buenos Aires', category: customerCategories[0] },
            { firstName: 'Florencia', lastName: 'Díaz', documentType: CustomerDocType.DNI, documentNumber: '33445566', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'florencia.diaz@email.com', phone: '11-4455-6677', address: 'Almagro 333', city: 'Buenos Aires', category: customerCategories[2] },
            { firstName: 'Gonzalo', lastName: 'Alvarez', documentType: CustomerDocType.CUIT, documentNumber: '20334455667', ivaCondition: IvaCondition.RESPONSABLE_INSCRIPTO, email: 'gonzalo.alvarez@email.com', phone: '11-5566-7788', address: 'Villa Crespo 444', city: 'Buenos Aires', category: customerCategories[1] },
            { firstName: 'Julieta', lastName: 'Castro', documentType: CustomerDocType.DNI, documentNumber: '44556677', ivaCondition: IvaCondition.CONSUMIDOR_FINAL, email: 'julieta.castro@email.com', phone: '11-6677-8899', address: 'Flores 555', city: 'Buenos Aires', category: customerCategories[3] },
        ];
        const customers: Customer[] = [];
        for (const c of customersData) {
            customers.push(await customerRepo.save(customerRepo.create(c as Partial<Customer>)));
        }
        console.log(`✅ ${customers.length} clientes creados`);

        // === 9. CATEGORÍAS DE GASTOS ===
        const expenseCategoriesData = [
            { name: 'Alquiler', description: 'Alquiler del local comercial', isRecurring: true },
            { name: 'Servicios', description: 'Luz, gas, agua, internet', isRecurring: true },
            { name: 'Sueldos', description: 'Pago de sueldos y salarios', isRecurring: true },
            { name: 'Publicidad', description: 'Marketing y publicidad', isRecurring: false },
            { name: 'Mantenimiento', description: 'Reparaciones y mantenimiento', isRecurring: false },
            { name: 'Impuestos', description: 'Impuestos y tasas', isRecurring: true },
            { name: 'Seguros', description: 'Seguros del negocio', isRecurring: true },
            { name: 'Otros', description: 'Otros gastos varios', isRecurring: false },
        ];
        const expenseCategories: ExpenseCategory[] = [];
        for (const e of expenseCategoriesData) {
            expenseCategories.push(await expenseCategoryRepo.save(expenseCategoryRepo.create(e)));
        }
        console.log(`✅ ${expenseCategories.length} categorías de gastos creadas`);

        // === 10. PROVEEDORES (8 proveedores) ===
        const suppliersData = [
            { name: 'Distribuidora Belleza Argentina S.A.', tradeName: 'Belleza AR', documentType: SupplierDocType.CUIT, documentNumber: '30-12345678-9', ivaCondition: IvaCondition.RESPONSABLE_INSCRIPTO, email: 'ventas@bellezaar.com', phone: '11-4000-1234', address: 'Av. Independencia 1234', city: 'Buenos Aires' },
            { name: 'Marroquinería El Cuero Premium', tradeName: 'El Cuero', documentType: SupplierDocType.CUIT, documentNumber: '30-23456789-0', ivaCondition: IvaCondition.RESPONSABLE_INSCRIPTO, email: 'pedidos@elcuero.com', phone: '11-4000-2345', address: 'Defensa 567', city: 'Buenos Aires' },
            { name: 'Importadora Perfumes Select', tradeName: 'Perfumes Select', documentType: SupplierDocType.CUIT, documentNumber: '30-34567890-1', ivaCondition: IvaCondition.RESPONSABLE_INSCRIPTO, email: 'compras@perfumesselect.com', phone: '11-4000-3456', address: 'Av. Santa Fe 890', city: 'Buenos Aires' },
            { name: 'Accesorios & Style S.R.L.', tradeName: 'A&S', documentType: SupplierDocType.CUIT, documentNumber: '30-45678901-2', ivaCondition: IvaCondition.RESPONSABLE_INSCRIPTO, email: 'ventas@aystyle.com', phone: '11-4000-4567', address: 'Av. Córdoba 1234', city: 'Buenos Aires' },
            { name: 'Cosmética Natural S.A.', tradeName: 'CosNat', documentType: SupplierDocType.CUIT, documentNumber: '30-56789012-3', ivaCondition: IvaCondition.RESPONSABLE_INSCRIPTO, email: 'pedidos@cosnat.com', phone: '11-4000-5678', address: 'Av. Callao 456', city: 'Buenos Aires' },
            { name: 'Joyería Mayorista del Sur', tradeName: 'Joyas del Sur', documentType: SupplierDocType.CUIT, documentNumber: '30-67890123-4', ivaCondition: IvaCondition.RESPONSABLE_INSCRIPTO, email: 'ventas@joyasdelsur.com', phone: '11-4000-6789', address: 'Av. San Juan 789', city: 'Buenos Aires' },
            { name: 'Relojería Internacional', tradeName: 'ReloInt', documentType: SupplierDocType.CUIT, documentNumber: '30-78901234-5', ivaCondition: IvaCondition.RESPONSABLE_INSCRIPTO, email: 'compras@reloint.com', phone: '11-4000-7890', address: 'Florida 234', city: 'Buenos Aires' },
            { name: 'Insumos de Belleza Express', tradeName: 'Belleza Exp', documentType: SupplierDocType.CUIT, documentNumber: '30-89012345-6', ivaCondition: IvaCondition.RESPONSABLE_MONOTRIBUTO, email: 'ventas@bellezaexp.com', phone: '11-4000-8901', address: 'Av. Rivadavia 5678', city: 'Buenos Aires' },
        ];
        const suppliers: Supplier[] = [];
        for (const s of suppliersData) {
            suppliers.push(await supplierRepo.save(supplierRepo.create(s)));
        }
        console.log(`✅ ${suppliers.length} proveedores creados`);

        // === 11. CATEGORÍAS DE INGRESOS ===
        const incomeCategoriesData = [
            { name: 'Servicios de Belleza', description: 'Maquillaje, peinados, tratamientos' },
            { name: 'Asesoría de Imagen', description: 'Consultoría de moda y estilo' },
            { name: 'Reparaciones', description: 'Reparación de accesorios y carteras' },
            { name: 'Personalización', description: 'Grabados y personalizaciones' },
            { name: 'Otros Servicios', description: 'Otros servicios varios' },
        ];
        const incomeCategories: IncomeCategory[] = [];
        for (const i of incomeCategoriesData) {
            incomeCategories.push(await incomeCategoryRepo.save(incomeCategoryRepo.create(i)));
        }
        console.log(`✅ ${incomeCategories.length} categorías de ingresos creadas`);

        // === 12. GASTOS HISTÓRICOS (12 meses) ===
        let expenseCount = 0;
        for (let month = 11; month >= 0; month--) {
            const daysAgo = month * 30;
            // Alquiler mensual
            await expenseRepo.save(expenseRepo.create({
                description: `Alquiler Local - Mes ${12 - month}/2024`,
                amount: 85000 + (11 - month) * 2000,
                expenseDate: parseLocalDate(getDateDaysAgo(daysAgo + 5)),
                category: expenseCategories[0],
                paymentMethod: paymentMethodsMap['transfer'],
                isPaid: true,
                paidAt: parseLocalDate(getDateDaysAgo(daysAgo + 5)),
                receiptNumber: `ALQ-2024-${(12 - month).toString().padStart(2, '0')}`,
                createdById: adminUser.id,
            }));
            expenseCount++;

            // Servicios
            await expenseRepo.save(expenseRepo.create({
                description: `Luz - Mes ${12 - month}/2024`,
                amount: 10000 + randomInt(0, 5000),
                expenseDate: parseLocalDate(getDateDaysAgo(daysAgo + 3)),
                category: expenseCategories[1],
                paymentMethod: paymentMethodsMap['debit_card'],
                isPaid: true,
                paidAt: parseLocalDate(getDateDaysAgo(daysAgo + 3)),
                receiptNumber: `LUZ-2024-${(12 - month).toString().padStart(2, '0')}`,
                createdById: adminUser.id,
            }));
            expenseCount++;

            await expenseRepo.save(expenseRepo.create({
                description: `Gas - Mes ${12 - month}/2024`,
                amount: 5000 + randomInt(0, 3000),
                expenseDate: parseLocalDate(getDateDaysAgo(daysAgo + 2)),
                category: expenseCategories[1],
                paymentMethod: paymentMethodsMap['debit_card'],
                isPaid: true,
                paidAt: parseLocalDate(getDateDaysAgo(daysAgo + 2)),
                receiptNumber: `GAS-2024-${(12 - month).toString().padStart(2, '0')}`,
                createdById: adminUser.id,
            }));
            expenseCount++;

            // Sueldos
            await expenseRepo.save(expenseRepo.create({
                description: `Sueldo Empleado 1 - Mes ${12 - month}/2024`,
                amount: 180000 + (11 - month) * 5000,
                expenseDate: parseLocalDate(getDateDaysAgo(daysAgo + 7)),
                category: expenseCategories[2],
                paymentMethod: paymentMethodsMap['transfer'],
                isPaid: true,
                paidAt: parseLocalDate(getDateDaysAgo(daysAgo + 7)),
                receiptNumber: `SUE-2024-${(12 - month).toString().padStart(2, '0')}-01`,
                createdById: adminUser.id,
            }));
            expenseCount++;

            await expenseRepo.save(expenseRepo.create({
                description: `Sueldo Empleado 2 - Mes ${12 - month}/2024`,
                amount: 150000 + (11 - month) * 4000,
                expenseDate: parseLocalDate(getDateDaysAgo(daysAgo + 7)),
                category: expenseCategories[2],
                paymentMethod: paymentMethodsMap['transfer'],
                isPaid: true,
                paidAt: parseLocalDate(getDateDaysAgo(daysAgo + 7)),
                receiptNumber: `SUE-2024-${(12 - month).toString().padStart(2, '0')}-02`,
                createdById: adminUser.id,
            }));
            expenseCount++;
        }
        console.log(`✅ ${expenseCount} gastos históricos creados`);

        // === 13. COMPRAS HISTÓRICAS (30+ compras) ===
        let purchaseCount = 0;
        const year = new Date().getFullYear();
        for (let i = 0; i < 35; i++) {
            const daysAgo = randomInt(5, 350);
            const supplier = randomElement(suppliers);
            const isPaid = daysAgo > 15 || Math.random() > 0.3;
            const numItems = randomInt(2, 5);
            const items: { product: Product; quantity: number; unitPrice: number }[] = [];

            for (let j = 0; j < numItems; j++) {
                const product = randomElement(products);
                items.push({
                    product,
                    quantity: randomInt(5, 30),
                    unitPrice: product.cost ?? 0,
                });
            }

            const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
            const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.05) : 0;
            const tax = 0;
            const total = subtotal + tax - discount;

            purchaseCount++;
            const purchaseNumber = `COMP-${year}-${purchaseCount.toString().padStart(5, '0')}`;

            const purchase = await purchaseRepo.save(purchaseRepo.create({
                purchaseNumber,
                providerName: supplier.name,
                providerDocument: supplier.documentNumber,
                providerPhone: supplier.phone,
                purchaseDate: parseLocalDate(getDateDaysAgo(daysAgo)),
                subtotal,
                tax,
                discount,
                total,
                status: isPaid ? PurchaseStatus.PAID : PurchaseStatus.PENDING,
                paymentMethod: isPaid ? randomElement([paymentMethodsMap['transfer'], paymentMethodsMap['cash'], paymentMethodsMap['debit_card']]) : undefined,
                paidAt: isPaid ? parseLocalDate(getDateDaysAgo(daysAgo)) : undefined,
                invoiceNumber: `FC-${purchaseCount.toString().padStart(4, '0')}-${year}`,
                inventoryUpdated: isPaid,
                createdById: adminUser.id,
                supplier,
            }));

            for (const itemData of items) {
                await purchaseItemRepo.save(purchaseItemRepo.create({
                    purchaseId: purchase.id,
                    productId: itemData.product.id,
                    quantity: itemData.quantity,
                    unitPrice: itemData.unitPrice,
                    subtotal: itemData.quantity * itemData.unitPrice,
                }));

                if (isPaid) {
                    const product = await productRepo.findOne({ where: { id: itemData.product.id } });
                    if (product) {
                        product.stock += itemData.quantity;
                        await productRepo.save(product);
                    }
                }
            }
        }
        console.log(`✅ ${purchaseCount} compras históricas creadas`);

        // === 14. VENTAS HISTÓRICAS (150+ ventas) ===
        // Mapa para mantener las cuentas corrientes y sus balances por cliente
        const customerAccountsMap: Map<string, { account: CustomerAccount; balance: number }> = new Map();
        let saleCount = 0;
        let onAccountSalesCount = 0;

        for (let i = 0; i < 180; i++) {
            const daysAgo = randomInt(0, 350);
            const hour = randomInt(9, 20);
            const minute = randomInt(0, 59);
            const customer = Math.random() > 0.3 ? randomElement(customers) : null;
            const isOnAccount = customer && Math.random() > 0.85;
            const numItems = randomInt(1, 5);
            const items: { product: Product; quantity: number; unitPrice: number }[] = [];

            for (let j = 0; j < numItems; j++) {
                const product = randomElement(products);
                items.push({
                    product,
                    quantity: randomInt(1, 3),
                    unitPrice: product.price ?? ((product.cost ?? 0) * 1.3),
                });
            }

            const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
            const discountPercent = Math.random() > 0.8 ? randomInt(5, 15) : 0;
            const discount = Math.round(subtotal * discountPercent / 100);
            const surchargePercent = Math.random() > 0.9 ? randomInt(5, 10) : 0;
            const surcharge = Math.round(subtotal * surchargePercent / 100);
            const total = subtotal - discount + surcharge;

            saleCount++;
            const saleNumber = `VENTA-${year}-${saleCount.toString().padStart(5, '0')}`;

            const sale = await saleRepo.save(saleRepo.create({
                saleNumber,
                customerId: customer?.id ?? null,
                customer,
                customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Consumidor Final',
                saleDate: getTimestampDaysAgo(daysAgo, hour, minute),
                subtotal,
                discount,
                surcharge,
                tax: 0,
                total,
                status: isOnAccount ? SaleStatus.PENDING : SaleStatus.COMPLETED,
                isOnAccount: !!isOnAccount,
                inventoryUpdated: true,
                createdById: adminUser.id,
            }));

            for (const itemData of items) {
                await saleItemRepo.save(saleItemRepo.create({
                    saleId: sale.id,
                    productId: itemData.product.id,
                    productCode: itemData.product.sku,
                    productDescription: itemData.product.name,
                    quantity: itemData.quantity,
                    unitPrice: itemData.unitPrice,
                    discount: 0,
                    discountPercent: 0,
                    subtotal: itemData.quantity * itemData.unitPrice,
                }));

                // Registrar movimiento de stock
                await stockMovementRepo.save(stockMovementRepo.create({
                    productId: itemData.product.id,
                    type: StockMovementType.OUT,
                    source: StockMovementSource.SALE,
                    quantity: itemData.quantity,
                    referenceId: sale.id,
                    date: getTimestampDaysAgo(daysAgo, hour, minute),
                    notes: `Venta ${saleNumber}`,
                }));
            }

            // Pagos si no es cuenta corriente
            if (!isOnAccount) {
                const paymentMethods = [paymentMethodsMap['cash'], paymentMethodsMap['debit_card'], paymentMethodsMap['credit_card'], paymentMethodsMap['transfer'], paymentMethodsMap['qr']];
                const pm = randomElement(paymentMethods);
                await salePaymentRepo.save(salePaymentRepo.create({
                    saleId: sale.id,
                    paymentMethodId: pm.id,
                    amount: total,
                    installments: pm.code === 'credit_card' ? randomElement([1, 3, 6, 12]) : null,
                }));
            } else if (customer) {
                // Si es venta a cuenta corriente, crear/actualizar cuenta y registrar movimiento
                onAccountSalesCount++;

                let accountData = customerAccountsMap.get(customer.id);

                // Crear cuenta si no existe
                if (!accountData) {
                    const newAccount = await customerAccountRepo.save(customerAccountRepo.create({
                        customerId: customer.id,
                        balance: 0,
                        creditLimit: randomElement([0, 50000, 100000, 200000]), // Límites de crédito variados
                        lastPurchaseDate: getTimestampDaysAgo(daysAgo, hour, minute),
                    }));
                    accountData = { account: newAccount, balance: 0 };
                    customerAccountsMap.set(customer.id, accountData);
                }

                // Registrar movimiento de cargo
                const balanceBefore = accountData.balance;
                const balanceAfter = balanceBefore + total;

                await accountMovementRepo.save(accountMovementRepo.create({
                    accountId: accountData.account.id,
                    movementType: MovementType.CHARGE,
                    amount: total, // Positivo = cargo
                    balanceBefore,
                    balanceAfter,
                    description: `Venta ${saleNumber}`,
                    referenceType: 'sale',
                    referenceId: sale.id,
                    createdById: adminUser.id,
                    createdAt: getTimestampDaysAgo(daysAgo, hour, minute),
                }));

                // Actualizar balance en el mapa y en la base de datos
                accountData.balance = balanceAfter;
                accountData.account.balance = balanceAfter;
                accountData.account.lastPurchaseDate = getTimestampDaysAgo(daysAgo, hour, minute);
                await customerAccountRepo.save(accountData.account);
            }
        }
        console.log(`✅ ${saleCount} ventas históricas creadas (${onAccountSalesCount} a cuenta corriente)`);
        console.log(`✅ ${customerAccountsMap.size} cuentas corrientes creadas con movimientos`);

        // === 15. INGRESOS POR SERVICIOS (60+ ingresos) ===
        let incomeCount = 0;
        const serviceDescriptions = [
            'Servicio de maquillaje profesional',
            'Peinado para evento',
            'Tratamiento facial completo',
            'Asesoría de imagen personal',
            'Reparación de cierre de cartera',
            'Grabado personalizado en billetera',
            'Limpieza de cuero premium',
            'Manicura profesional',
            'Diseño de uñas artístico',
            'Consultoría de estilo',
        ];

        for (let i = 0; i < 75; i++) {
            const daysAgo = randomInt(0, 350);
            const customer = Math.random() > 0.4 ? randomElement(customers) : null;
            const category = randomElement(incomeCategories);
            const isOnAccount = customer && Math.random() > 0.9;
            const amount = randomInt(5000, 50000);

            incomeCount++;
            await incomeRepo.save(incomeRepo.create({
                description: randomElement(serviceDescriptions),
                amount,
                incomeDate: parseLocalDate(getDateDaysAgo(daysAgo)),
                categoryId: category.id,
                customerId: customer?.id ?? null,
                customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Consumidor Final',
                isOnAccount: !!isOnAccount,
                paymentMethodId: isOnAccount ? null : randomElement(Object.values(paymentMethodsMap)).id,
                isPaid: !isOnAccount,
                paidAt: isOnAccount ? null : parseLocalDate(getDateDaysAgo(daysAgo)),
                createdById: adminUser.id,
            }));
        }
        console.log(`✅ ${incomeCount} ingresos por servicios creados`);

        // === RESUMEN FINAL ===
        console.log('\n🎉 ¡SEED COMPLETADO EXITOSAMENTE!');
        console.log('\n📊 RESUMEN DE DATOS CREADOS:');
        console.log('────────────────────────────────');
        console.log(`   👤 1 usuario admin (admin / Admin123)`);
        console.log(`   📦 ${categories.length} categorías de productos`);
        console.log(`   🛍️  ${products.length} productos`);
        console.log(`   👥 ${customerCategories.length} categorías de clientes`);
        console.log(`   🧑 ${customers.length} clientes`);
        console.log(`   📁 ${expenseCategories.length} categorías de gastos`);
        console.log(`   💰 ${expenseCount} gastos (12 meses)`);
        console.log(`   🏭 ${suppliers.length} proveedores`);
        console.log(`   📋 ${purchaseCount} compras`);
        console.log(`   💵 ${incomeCategories.length} categorías de ingresos`);
        console.log(`   💵 ${incomeCount} ingresos por servicios`);
        console.log(`   🛒 ${saleCount} ventas`);
        console.log('────────────────────────────────');

    } catch (error) {
        console.error('❌ Error en seed:', error);
        throw error;
    } finally {
        await dataSource.destroy();
        console.log('\n🔌 Conexión cerrada.');
    }
}

seed();
