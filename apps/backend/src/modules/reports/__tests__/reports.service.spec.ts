/**
 * Reports Service Unit Tests - Main Methods
 * Tests the core business logic methods
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../reports.service';
import { Sale } from '../../sales/entities/sale.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';
import { SalePayment } from '../../sales/entities/sale-payment.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';
import { Expense } from '../../expenses/entities/expense.entity';
import { Income } from '../../incomes/entities/income.entity';
import { Product } from '../../products/entities/product.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CustomerAccount } from '../../customer-accounts/entities/customer-account.entity';
import { AccountMovement } from '../../customer-accounts/entities/account-movement.entity';
import { CashRegisterService } from '../../cash-register/cash-register.service';
import { ConfigurationService } from '../../configuration/configuration.service';
import { ReportPeriod } from '../dto';
import { SaleStatus } from '../../sales/entities/sale.entity';
import { MovementType } from '../../customer-accounts/entities/account-movement.entity';
import {
    createAllMockRepositories,
    resetAllMocks,
    createMockSale,
    createMockSalePayment,
    createMockPurchase,
    createMockExpense,
    createMockIncome,
    createMockProduct,
    createMockCustomer,
    createMockCustomerAccount,
    createMockAccountMovement,
    createSalesWithPayments,
    createExpensesWithCategory,
    createProductsWithStock,
    getDateString,
    createDateAtMidnight,
    createDateAtEndOfDay,
    daysAgo,
    monthsAgo
} from './mocks';

describe('ReportsService - Main Methods', () => {
    let service: ReportsService;
    let repos: ReturnType<typeof createAllMockRepositories>;

    beforeEach(async () => {
        repos = createAllMockRepositories();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportsService,
                {
                    provide: 'SaleRepository',
                    useValue: repos.saleRepo,
                },
                {
                    provide: 'SaleItemRepository',
                    useValue: repos.saleItemRepo,
                },
                {
                    provide: 'SalePaymentRepository',
                    useValue: repos.salePaymentRepo,
                },
                {
                    provide: 'PurchaseRepository',
                    useValue: repos.purchaseRepo,
                },
                {
                    provide: 'ExpenseRepository',
                    useValue: repos.expenseRepo,
                },
                {
                    provide: 'IncomeRepository',
                    useValue: repos.incomeRepo,
                },
                {
                    provide: 'ProductRepository',
                    useValue: repos.productRepo,
                },
                {
                    provide: 'CustomerRepository',
                    useValue: repos.customerRepo,
                },
                {
                    provide: 'CustomerAccountRepository',
                    useValue: repos.accountRepo,
                },
                {
                    provide: 'AccountMovementRepository',
                    useValue: repos.accountMovementRepo,
                },
                {
                    provide: CashRegisterService,
                    useValue: repos.cashRegisterService,
                },
                {
                    provide: ConfigurationService,
                    useValue: repos.configurationService,
                },
            ],
        }).compile();

        service = module.get<ReportsService>(ReportsService);
    });

    afterEach(() => {
        resetAllMocks(repos);
        jest.useRealTimers();
    });

    describe('getFinancialReport', () => {
        it('should return structure with empty data when no sales exist', async () => {
            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getFinancialReport();

            expect(result).toHaveProperty('period');
            expect(result).toHaveProperty('revenue');
            expect(result).toHaveProperty('incomes');
            expect(result).toHaveProperty('costs');
            expect(result).toHaveProperty('expenses');
            expect(result).toHaveProperty('profitability');
            expect(result).toHaveProperty('summary');
        });

        it('should calculate revenue from completed sales only', async () => {
            const completedSale = createMockSale({ status: SaleStatus.COMPLETED, total: 1000 });
            const pendingSale = createMockSale({ status: SaleStatus.PENDING, total: 500 });
            const cancelledSale = createMockSale({ status: SaleStatus.CANCELLED, total: 300 });

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([completedSale, pendingSale, cancelledSale]);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getFinancialReport();

            expect(result.revenue.totalRevenue).toBe(1000);
            expect(result.revenue.completedSales).toBe(1);
            expect(result.revenue.pendingSales).toBe(1);
            expect(result.revenue.cancelledSales).toBe(1);
        });

        it('should calculate costs from paid purchases only', async () => {
            const paidPurchase = createMockPurchase({ status: 'paid' as any, total: 400 });
            const pendingPurchase = createMockPurchase({ status: 'pending' as any, total: 200 });

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([paidPurchase, pendingPurchase]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getFinancialReport();

            expect(result.costs.costOfGoodsSold).toBe(400);
            expect(result.costs.paidPurchases).toBe(1);
            expect(result.costs.pendingPurchases).toBe(1);
        });

        it('should calculate expenses from paid expenses only', async () => {
            const paidExpense = createMockExpense({ isPaid: true, amount: 150 });
            const unpaidExpense = createMockExpense({ isPaid: false, amount: 75 });

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([paidExpense, unpaidExpense]);

            const result = await service.getFinancialReport();

            expect(result.expenses.operatingExpenses).toBe(150);
            expect(result.expenses.paidExpenses).toBe(1);
            expect(result.expenses.pendingExpenses).toBe(1);
        });

        it('should group expenses by category correctly', async () => {
            const expense1 = createMockExpense({
                isPaid: true,
                amount: 100,
                categoryId: 'cat-1',
                category: { id: 'cat-1', name: 'Office Supplies', isActive: true, isRecurring: false, expenses: [], createdAt: new Date() }
            });
            const expense2 = createMockExpense({
                isPaid: true,
                amount: 200,
                categoryId: 'cat-1',
                category: { id: 'cat-1', name: 'Office Supplies', isActive: true, isRecurring: false, expenses: [], createdAt: new Date() }
            });
            const expense3 = createMockExpense({
                isPaid: true,
                amount: 50,
                categoryId: null, // uncategorized
            });

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([expense1, expense2, expense3]);

            const result = await service.getFinancialReport();

            expect(result.expenses.byCategory).toHaveLength(2);
            const officeCategory = result.expenses.byCategory.find(c => c.categoryId === 'cat-1');
            const uncategorized = result.expenses.byCategory.find(c => c.categoryId === null);

            expect(officeCategory).toEqual({
                categoryId: 'cat-1',
                categoryName: 'Office Supplies',
                count: 2,
                total: 300,
                percentage: 85.71428571428571, // 300/350 * 100
            });
            expect(uncategorized).toEqual({
                categoryId: null,
                categoryName: 'Sin categoría',
                count: 1,
                total: 50,
                percentage: 14.285714285714285,
            });
        });

        it('should calculate profitability metrics correctly', async () => {
            const sale = createMockSale({ total: 1000 }); // revenue
            const income = createMockIncome({ amount: 200 }); // additional revenue
            const purchase = createMockPurchase({ status: 'paid' as any, total: 300 }); // costs
            const expense = createMockExpense({ isPaid: true, amount: 100 }); // operating expenses

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([sale]);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue([income]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([purchase]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([expense]);

            const result = await service.getFinancialReport();

            expect(result.profitability.grossProfit).toBe(900); // 1200 - 300
            expect(result.profitability.grossMargin).toBe(75); // 900/1200 * 100
            expect(result.profitability.netProfit).toBe(800); // 900 - 100
            expect(result.profitability.netMargin).toBe(66.66666666666666); // 800/1200 * 100
            expect(result.profitability.roi).toBe(200);
        });

        it('should handle zero costs in ROI calculation', async () => {
            const sale = createMockSale({ total: 1000 });
            const income = createMockIncome({ amount: 200 });

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([sale]);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue([income]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getFinancialReport();

            expect(result.profitability.roi).toBe(0); // no costs = 0 ROI
        });
    });

    describe('getSalesReport', () => {
        it('should exclude cancelled sales from calculations', async () => {
            const completedSale = createMockSale({ status: SaleStatus.COMPLETED, total: 500 });
            const cancelledSale = createMockSale({ status: SaleStatus.CANCELLED, total: 300 });

            repos.saleRepo._queryBuilder.getMany
                .mockResolvedValueOnce([completedSale])
                .mockResolvedValueOnce([]); // previous

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getSalesReport();

            expect(result.current.totalRevenue).toBe(500);
            expect(result.current.totalSales).toBe(1);
            expect(repos.saleRepo._queryBuilder.andWhere).toHaveBeenCalledWith(
                'sale.status != :cancelled',
                { cancelled: SaleStatus.CANCELLED }
            );
        });

        it('should calculate metrics correctly', async () => {
            const sales = [
                createMockSale({ total: 200 }),
                createMockSale({ total: 300 }),
            ];

            repos.saleRepo._queryBuilder.getMany
                .mockResolvedValueOnce(sales)
                .mockResolvedValueOnce([]);

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getSalesReport();

            expect(result.current.totalRevenue).toBe(500);
            expect(result.current.totalSales).toBe(2);
            expect(result.current.averageTicket).toBe(250);
        });

        it('should build payment method breakdown correctly', async () => {
            const sale = createMockSale({
                total: 500,
                payments: [
                    createMockSalePayment({ paymentMethodId: 'cash', paymentMethod: { id: 'cash', name: 'Efectivo', code: 'CASH', isActive: true, createdAt: new Date(), updatedAt: new Date() }, amount: 200 }),
                    createMockSalePayment({ paymentMethodId: 'card', paymentMethod: { id: 'card', name: 'Tarjeta', code: 'CARD', isActive: true, createdAt: new Date(), updatedAt: new Date() }, amount: 200 }),
                    createMockSalePayment({ paymentMethodId: 'cash', paymentMethod: { id: 'cash', name: 'Efectivo', code: 'CASH', isActive: true, createdAt: new Date(), updatedAt: new Date() }, amount: 100 }),
                ]
            });

            repos.saleRepo._queryBuilder.getMany
                .mockResolvedValueOnce([sale])
                .mockResolvedValueOnce([]);

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getSalesReport();

            expect(result.current.byPaymentMethod).toHaveLength(2);
            const cashMethod = result.current.byPaymentMethod.find(p => p.methodId === 'cash');
            const cardMethod = result.current.byPaymentMethod.find(p => p.methodId === 'card');

            expect(cashMethod).toEqual({
                methodId: 'cash',
                methodName: 'Efectivo',
                total: 300,
                count: 2,
                percentage: 60,
            });
            expect(cardMethod).toEqual({
                methodId: 'card',
                methodName: 'Tarjeta',
                total: 200,
                count: 1,
                percentage: 40,
            });
        });

        it('should count sales by status correctly', async () => {
            const sales = [
                createMockSale({ status: SaleStatus.COMPLETED }),
                createMockSale({ status: SaleStatus.PENDING }),
                createMockSale({ status: SaleStatus.COMPLETED }),
            ];

            repos.saleRepo._queryBuilder.getMany
                .mockResolvedValueOnce(sales)
                .mockResolvedValueOnce([]);

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getSalesReport();

            expect(result.current.byStatus).toEqual({
                [SaleStatus.COMPLETED]: 2,
                [SaleStatus.PENDING]: 1,
            });
        });

        it('should build daily sales data correctly', async () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const sales = [
                createMockSale({ saleDate: today, total: 200 }),
                createMockSale({ saleDate: today, total: 300 }),
                createMockSale({ saleDate: yesterday, total: 100 }),
            ];

            repos.saleRepo._queryBuilder.getMany
                .mockResolvedValueOnce(sales)
                .mockResolvedValueOnce([]);

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getSalesReport();

            expect(result.dailyData).toHaveLength(2);
            const todayData = result.dailyData.find(d => d.date === getDateString(today));
            const yesterdayData = result.dailyData.find(d => d.date === getDateString(yesterday));

            expect(todayData).toEqual({
                date: getDateString(today),
                revenue: 500,
                salesCount: 2,
            });
            expect(yesterdayData).toEqual({
                date: getDateString(yesterday),
                revenue: 100,
                salesCount: 1,
            });
        });
    });

    describe('getTopProducts', () => {
        it('should include only completed sales', async () => {
            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([]);

            await service.getTopProducts();

            expect(repos.saleItemRepo.createQueryBuilder).toHaveBeenCalled();
            // The query builder should have status = COMPLETED filter
        });

        it('should calculate profit correctly', async () => {
            const item = {
                id: 'item-1',
                productId: 'prod-1',
                quantity: 2,
                subtotal: 200,
                product: createMockProduct({ id: 'prod-1', cost: 50 }), // cost per unit = 50
            };

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([item]);

            const result = await service.getTopProducts();

            expect(result).toHaveLength(1);
            expect(result[0].productId).toBe('prod-1');
            expect(result[0].quantitySold).toBe(2);
            expect(result[0].revenue).toBe(200);
            expect(result[0].cost).toBe(100); // 2 * 50
            expect(result[0].profit).toBe(100); // 200 - 100
            expect(result[0].margin).toBe(50); // 100/200 * 100
        });

        it('should aggregate by product correctly', async () => {
            const items = [
                {
                    id: 'item-1',
                    productId: 'prod-1',
                    quantity: 1,
                    subtotal: 100,
                    product: createMockProduct({ id: 'prod-1', cost: 50 }),
                },
                {
                    id: 'item-2',
                    productId: 'prod-1',
                    quantity: 2,
                    subtotal: 200,
                    product: createMockProduct({ id: 'prod-1', cost: 50 }),
                },
                {
                    id: 'item-3',
                    productId: 'prod-2',
                    quantity: 1,
                    subtotal: 150,
                    product: createMockProduct({ id: 'prod-2', cost: 75 }),
                },
            ];

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue(items);

            const result = await service.getTopProducts();

            expect(result).toHaveLength(2);
            const prod1 = result.find(p => p.productId === 'prod-1');
            const prod2 = result.find(p => p.productId === 'prod-2');

            expect(prod1?.quantitySold).toBe(3); // 1 + 2
            expect(prod1?.revenue).toBe(300); // 100 + 200
            expect(prod1?.cost).toBe(150); // 3 * 50
            expect(prod1?.profit).toBe(150);

            expect(prod2?.quantitySold).toBe(1);
            expect(prod2?.revenue).toBe(150);
            expect(prod2?.cost).toBe(75);
            expect(prod2?.profit).toBe(75);
        });

        it('should respect limit parameter', async () => {
            const items = Array.from({ length: 5 }, (_, i) => ({
                id: `item-${i}`,
                productId: `prod-${i}`,
                quantity: 1,
                subtotal: 100 + i * 10,
                product: createMockProduct({ id: `prod-${i}`, cost: 50 }),
            }));

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue(items);

            const result = await service.getTopProducts(undefined, undefined, undefined, 3);

            expect(result).toHaveLength(3);
        });

        it('should sort by revenue descending', async () => {
            const items = [
                {
                    id: 'item-1',
                    productId: 'prod-1',
                    quantity: 1,
                    subtotal: 100,
                    product: createMockProduct({ id: 'prod-1' }),
                },
                {
                    id: 'item-2',
                    productId: 'prod-2',
                    quantity: 1,
                    subtotal: 200,
                    product: createMockProduct({ id: 'prod-2' }),
                },
            ];

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue(items);

            const result = await service.getTopProducts();

            expect(result[0].productId).toBe('prod-2'); // higher revenue first
            expect(result[1].productId).toBe('prod-1');
        });
    });

    describe('getProductsReport', () => {
        it('should call getTopProducts with limit 20', async () => {
            const saleItems = Array.from({ length: 20 }, (_, i) => ({
                id: `item-${i}`,
                productId: `prod-${i}`,
                quantity: 1,
                subtotal: 100,
                product: createMockProduct({ id: `prod-${i}` }),
            }));
            const mockProducts = Array.from({ length: 100 }, (_, i) =>
                createMockProduct({ id: `prod-${i}`, stock: 10 })
            );

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue(saleItems);
            repos.productRepo.find.mockResolvedValue(mockProducts);

            const result = await service.getProductsReport();

            expect(result.topProducts).toHaveLength(20);
        });

        it('should calculate inventory stats correctly', async () => {
            const products = [
                createMockProduct({ stock: 10 }), // with stock
                createMockProduct({ stock: 5 }),  // with stock, low
                createMockProduct({ stock: 0 }),  // out of stock
                createMockProduct({ stock: 15 }), // with stock
            ];

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.productRepo.find.mockResolvedValue(products);

            const result = await service.getProductsReport();

            expect(result.inventory.totalProducts).toBe(4);
            expect(result.inventory.productsWithStock).toBe(3);
            expect(result.inventory.productsOutOfStock).toBe(1);
            expect(result.inventory.productsLowStock).toBe(1); // assuming minStockAlert = 5
            expect(result.inventory.totalStockValue).toBe(1500);
            expect(result.inventory.totalSaleValue).toBe(3000);
        });

        it('should identify low rotation products correctly', async () => {
            const saleItems = [
                {
                    id: 'item-1',
                    productId: 'prod-1',
                    quantity: 1,
                    subtotal: 100,
                    product: createMockProduct({ id: 'prod-1' }),
                },
                {
                    id: 'item-2',
                    productId: 'prod-2',
                    quantity: 1,
                    subtotal: 100,
                    product: createMockProduct({ id: 'prod-2' }),
                },
            ];
            const allProducts = [
                createMockProduct({ id: 'prod-1', stock: 5 }), // sold
                createMockProduct({ id: 'prod-2', stock: 3 }), // sold
                createMockProduct({ id: 'prod-3', stock: 10 }), // not sold, with stock
                createMockProduct({ id: 'prod-4', stock: 0 }), // out of stock
            ];

            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue(saleItems);
            repos.productRepo.find.mockResolvedValue(allProducts);

            const result = await service.getProductsReport();

            expect(result.lowRotationProducts).toHaveLength(1);
            expect(result.lowRotationProducts[0].productId).toBe('prod-3');
        });
    });

    describe('getTopCustomers', () => {
        it('should include only customers with completed sales', async () => {
            const sales = [
                createMockSale({ customerId: 'cust-1', customer: createMockCustomer({ id: 'cust-1', firstName: 'John', lastName: 'Doe' }), status: SaleStatus.COMPLETED, total: 200 }),
                createMockSale({ customerId: null, status: SaleStatus.COMPLETED, total: 100 }), // no customer
                createMockSale({ customerId: 'cust-2', status: SaleStatus.PENDING, total: 150 }), // not completed
            ];

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue(sales);
            const result = await service.getTopCustomers();

            expect(result).toHaveLength(1);
            expect(result[0].customerId).toBe('cust-1');
        });

        it('should aggregate purchases correctly', async () => {
            const sales = [
                createMockSale({
                    customerId: 'cust-1',
                    customer: createMockCustomer({ id: 'cust-1', firstName: 'John', lastName: 'Doe' }),
                    total: 200,
                    saleDate: new Date('2024-01-15'),
                }),
                createMockSale({
                    customerId: 'cust-1',
                    customer: createMockCustomer({ id: 'cust-1', firstName: 'John', lastName: 'Doe' }),
                    total: 300,
                    saleDate: new Date('2024-01-20'),
                }),
            ];

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue(sales);

            const result = await service.getTopCustomers();

            expect(result).toHaveLength(1);
            expect(result[0].totalPurchases).toBe(2);
            expect(result[0].totalAmount).toBe(500);
            expect(result[0].averageTicket).toBe(250);
            expect(result[0].lastPurchaseDate.getTime()).toBe(new Date('2024-01-20').getTime());
        });

        it('should sort by total amount descending', async () => {
            const sales = [
                createMockSale({ customerId: 'cust-1', customer: createMockCustomer({ id: 'cust-1' }), total: 200 }),
                createMockSale({ customerId: 'cust-2', customer: createMockCustomer({ id: 'cust-2' }), total: 300 }),
            ];

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue(sales);

            const result = await service.getTopCustomers();

            expect(result[0].customerId).toBe('cust-2'); // higher amount first
            expect(result[1].customerId).toBe('cust-1');
        });
    });

    describe('getCustomersReport', () => {
        it('should calculate accounts statistics correctly', async () => {
            const accounts = [
                createMockCustomerAccount({ balance: 500 }),
                createMockCustomerAccount({ balance: -200 }),
                createMockCustomerAccount({ balance: 300 }),
            ];

            repos.saleRepo._queryBuilder.getMany
                .mockResolvedValueOnce([]) // current period sales
                .mockResolvedValueOnce([]); // previous period sales

            repos.accountRepo.find.mockResolvedValue(accounts);

            const result = await service.getCustomersReport();

            expect(result.accountsStats.totalAccounts).toBe(3);
            expect(result.accountsStats.activeAccounts).toBe(3);
            expect(result.accountsStats.totalDebt).toBe(600); // 500 + 300 (positive balances)
            expect(result.accountsStats.averageDebt).toBe(300);
        });

        it('should identify new vs returning customers', async () => {
            const currentPeriodSales = [
                createMockSale({ customerId: 'cust-1' }),
                createMockSale({ customerId: 'cust-2' }),
                createMockSale({ customerId: 'cust-1' }), // returning
            ];

            const previousPeriodSales = [
                createMockSale({ customerId: 'cust-1' }), // was here before
            ];

            repos.saleRepo._queryBuilder.getMany
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce(currentPeriodSales)
                .mockResolvedValueOnce(previousPeriodSales);

            repos.accountRepo.find.mockResolvedValue([]);

            const result = await service.getCustomersReport();

            expect(result.newCustomers).toBe(1); // cust-2
            expect(result.returningCustomers).toBe(1); // cust-1
        });
    });

    describe('getExpensesReport', () => {
        it('should include only paid expenses', async () => {
            const paidExpense = createMockExpense({ isPaid: true, amount: 200 });
            const unpaidExpense = createMockExpense({ isPaid: false, amount: 100 });

            repos.expenseRepo._queryBuilder.getMany
                .mockResolvedValueOnce([paidExpense]) // current
                .mockResolvedValueOnce([]); // previous

            const result = await service.getExpensesReport();

            expect(result.current.totalAmount).toBe(200);
            expect(result.current.totalCount).toBe(1);
        });

        it('should build monthly trend correctly', async () => {
            const expenses = [
                createMockExpense({
                    isPaid: true,
                    amount: 100,
                    expenseDate: new Date('2024-01-15'),
                }),
                createMockExpense({
                    isPaid: true,
                    amount: 200,
                    expenseDate: new Date('2024-01-20'),
                }),
                createMockExpense({
                    isPaid: true,
                    amount: 150,
                    expenseDate: new Date('2024-02-10'),
                }),
            ];

            repos.expenseRepo._queryBuilder.getMany
                .mockResolvedValueOnce(expenses) // current
                .mockResolvedValueOnce([]) // previous
                .mockResolvedValueOnce(expenses);

            const result = await service.getExpensesReport();

            expect(result.current.monthlyTrend).toHaveLength(2);
            expect(result.current.monthlyTrend[0]).toEqual({ month: '2024-01', total: 300 });
            expect(result.current.monthlyTrend[1]).toEqual({ month: '2024-02', total: 150 });
        });
    });

    describe('getCashFlowReport', () => {
        it('should calculate total income from completed sales', async () => {
            const sales = [
                createMockSale({ total: 200 }),
                createMockSale({ total: 300 }),
            ];

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue(sales);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getCashFlowReport();

            expect(result.totalIncome).toBe(500);
            expect(result.totalExpense).toBe(0);
            expect(result.netCashFlow).toBe(500);
        });

        it('should calculate total expense from paid purchases and expenses', async () => {
            const purchases = [createMockPurchase({ status: 'paid' as any, total: 200 })];
            const expenses = [createMockExpense({ isPaid: true, amount: 100 })];

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue(purchases);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue(expenses);

            const result = await service.getCashFlowReport();

            expect(result.totalIncome).toBe(0);
            expect(result.totalExpense).toBe(300);
            expect(result.netCashFlow).toBe(-300);
        });

        it('should build daily breakdown with cumulative totals', async () => {
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-03');

            // Mock the period calculation
            jest.spyOn(service as any, 'getPeriodDates').mockReturnValue({
                start: startDate,
                end: endDate,
            });

            const sales = [
                createMockSale({ saleDate: new Date('2024-01-01'), total: 100 }),
                createMockSale({ saleDate: new Date('2024-01-02'), total: 200 }),
            ];

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue(sales);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getCashFlowReport();

            expect(result.byDay).toHaveLength(3); // 3 days
            expect(result.byDay[0].date).toBe('2024-01-01');
            expect(result.byDay[0].income).toBe(100);
            expect(result.byDay[0].net).toBe(100);
            expect(result.byDay[0].cumulative).toBe(100);

            expect(result.byDay[1].date).toBe('2024-01-02');
            expect(result.byDay[1].income).toBe(200);
            expect(result.byDay[1].net).toBe(200);
            expect(result.byDay[1].cumulative).toBe(300);

            expect(result.byDay[2].date).toBe('2024-01-03');
            expect(result.byDay[2].income).toBe(0);
            expect(result.byDay[2].net).toBe(0);
            expect(result.byDay[2].cumulative).toBe(300);
        });
    });

    describe('getDashboardSummary', () => {
        beforeEach(() => {
            jest.useFakeTimers().setSystemTime(new Date('2024-01-15T12:00:00Z'));
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return complete dashboard structure', async () => {
            // Mock all the required data
            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.accountMovementRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.productRepo.find.mockResolvedValue([]);
            repos.accountRepo.find.mockResolvedValue([]);
            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getDashboardSummary();

            expect(result).toHaveProperty('today');
            expect(result).toHaveProperty('week');
            expect(result).toHaveProperty('month');
            expect(result).toHaveProperty('inventory');
            expect(result).toHaveProperty('accounts');
            expect(result).toHaveProperty('cashRegister');
            expect(result).toHaveProperty('charts');
            expect(result).toHaveProperty('topProducts');
            expect(result).toHaveProperty('alerts');
        });

        it('should calculate today metrics correctly', async () => {
            const todaySales = [createMockSale({ total: 500 })];
            const todayIncomes = [createMockIncome({ amount: 200 })];
            const todayExpenses = [createMockExpense({ isPaid: true, amount: 150 })];
            const todayPurchases = [createMockPurchase({ status: 'paid' as any, total: 300 })];
            const todayAccountPayments = [createMockAccountMovement({ amount: -100 })];

            repos.saleRepo._queryBuilder.getMany.mockResolvedValue(todaySales);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue(todayIncomes);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue(todayExpenses);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue(todayPurchases);
            repos.accountMovementRepo._queryBuilder.getMany.mockResolvedValue(todayAccountPayments);

            // Mock other required queries to return empty
            repos.productRepo.find.mockResolvedValue([]);
            repos.accountRepo.find.mockResolvedValue([]);
            repos.saleItemRepo._queryBuilder.getMany.mockResolvedValue([]);

            const result = await service.getDashboardSummary();

            expect(result.today.sales.revenue).toBe(700); // 500 + 200
            expect(result.today.expenses.amount).toBe(150);
            expect(result.today.purchases.amount).toBe(300);
            expect(result.today.netCashFlow).toBe(700 + 100 - 150 - 300); // sales + payments - expenses - purchases
        });

        it('should calculate alerts correctly', async () => {
            repos.saleRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.incomeRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.purchaseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.expenseRepo._queryBuilder.getMany.mockResolvedValue([]);
            repos.accountMovementRepo._queryBuilder.getMany.mockResolvedValue([]);

            const products = [
                createMockProduct({ stock: 0 }), // out of stock
                createMockProduct({ stock: 2 }), // low stock (assuming min = 5)
            ];
            repos.productRepo.find.mockResolvedValue(products);

            const accounts = [
                createMockCustomerAccount({ daysOverdue: 10 }),
            ];
            repos.accountRepo.find.mockResolvedValue(accounts);

            const result = await service.getDashboardSummary();

            expect(result.alerts.lowStockCount).toBe(1);
            expect(result.alerts.outOfStockCount).toBe(1);
            expect(result.alerts.overdueAccountsCount).toBe(1);
        });
    });
});
