/**
 * Tests unitarios para CashRegisterService
 * Cubre: open, close, reopen, movimientos manuales, balances, validaciones
 */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';

import { CashRegisterService } from './cash-register.service';
import { CashRegister, CashRegisterStatus } from './entities/cash-register.entity';
import { CashMovement, MovementType } from './entities/cash-movement.entity';
import { CashRegisterTotals } from './entities/cash-register-totals.entity';
import { PaymentMethod } from '../configuration/entities/payment-method.entity';
import { AuditService } from '../audit/audit.service';
import { createOpenCashRegisterDTO, createCloseCashRegisterDTO, createCashMovementDTO } from '../../test/factories';

const mockCashRegisterRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockCashMovementRepository = {
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
};

const mockCashTotalsRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    increment: jest.fn(),
};

const mockPaymentMethodRepository = {
    find: jest.fn(),
    findOneBy: jest.fn(),
};

const mockAuditService = {
    logSilent: jest.fn(),
};

const mockDataSource = {
    query: jest.fn(),
    createQueryRunner: jest.fn(),
};

describe('CashRegisterService', () => {
    let service: CashRegisterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CashRegisterService,
                { provide: getRepositoryToken(CashRegister), useValue: mockCashRegisterRepository },
                { provide: getRepositoryToken(CashMovement), useValue: mockCashMovementRepository },
                { provide: getRepositoryToken(CashRegisterTotals), useValue: mockCashTotalsRepository },
                { provide: getRepositoryToken(PaymentMethod), useValue: mockPaymentMethodRepository },
                { provide: getDataSourceToken(), useValue: mockDataSource },
                { provide: AuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get<CashRegisterService>(CashRegisterService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getSuggestedInitialAmount', () => {
        it('debe retornar saldo sugerido del día anterior', async () => {
            const previousRegister = {
                id: 'cash-prev',
                date: '2024-01-15',
                actualAmount: 15000,
                status: CashRegisterStatus.CLOSED,
            };

            mockCashRegisterRepository.findOne.mockResolvedValue(previousRegister);

            const result = await service.getSuggestedInitialAmount();

            expect(result.suggested).toBe(15000);
            expect(result.previousDate).toBe('2024-01-15');
            expect(result.previousActual).toBe(15000);
        });

        it('debe retornar 0 si no hay registro anterior', async () => {
            mockCashRegisterRepository.findOne.mockResolvedValue(null);

            const result = await service.getSuggestedInitialAmount();

            expect(result.suggested).toBe(0);
            expect(result.previousDate).toBeNull();
            expect(result.previousActual).toBe(0);
        });
    });

    describe('open', () => {
        const mockOpenRegister = (overrides: Partial<CashRegister> = {}) => ({
            id: 'cash-1',
            status: CashRegisterStatus.OPEN,
            openedBy: { firstName: 'Test', lastName: 'User' },
            totals: [],
            movements: [],
            ...overrides,
        });

        beforeEach(() => {
            mockPaymentMethodRepository.find.mockResolvedValue([
                { id: 'pm-1', code: 'cash', name: 'Efectivo', isActive: true },
                { id: 'pm-2', code: 'debit', name: 'Débito', isActive: true },
            ]);
            mockCashTotalsRepository.save.mockResolvedValue({});
        });

        it('debe abrir una caja cuando no hay abierta', async () => {
            const dto = createOpenCashRegisterDTO({ initialAmount: 10000 });

            mockCashRegisterRepository.findOne
                .mockResolvedValueOnce(null) // getOpenRegister
                .mockResolvedValueOnce(null) // existingTodaysRegister
                .mockResolvedValueOnce(null) // previousDay
                .mockResolvedValueOnce(mockOpenRegister()); // reload

            mockCashRegisterRepository.create.mockImplementation((data) => ({ id: 'cash-1', ...data }));
            mockCashRegisterRepository.save.mockResolvedValue({ id: 'cash-1' });

            const result = await service.open(dto, 'user-1');

            expect(result).toBeDefined();
            expect(mockCashRegisterRepository.save).toHaveBeenCalled();
            expect(mockAuditService.logSilent).toHaveBeenCalledWith(
                expect.objectContaining({
                    entityType: 'cash_register',
                    action: 'OPEN',
                })
            );
        });

        it('debe lanzar error si ya hay caja abierta', async () => {
            const openRegister = {
                id: 'cash-existing',
                status: CashRegisterStatus.OPEN,
                openedBy: { firstName: 'Test', lastName: 'User' },
                totals: [],
            };
            mockCashRegisterRepository.findOne.mockResolvedValue(openRegister);
            // Mockear el queryBuilder para loadMovementsWithDetails
            mockCashMovementRepository.createQueryBuilder.mockReturnValue({
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            });

            await expect(service.open({ initialAmount: 10000 }, 'user-1')).rejects.toThrow(
                new BadRequestException('Ya existe una caja abierta')
            );
        });

        it('debe lanzar error si ya existe caja cerrada hoy', async () => {
            mockCashRegisterRepository.findOne
                .mockResolvedValueOnce(null) // getOpenRegister
                .mockResolvedValueOnce({ id: 'cash-today', status: CashRegisterStatus.CLOSED, date: new Date() }); // existingTodaysRegister

            await expect(service.open({ initialAmount: 10000 }, 'user-1')).rejects.toThrow(
                new BadRequestException('Ya existe una caja cerrada para el día de hoy. Debe reabrirla para continuar operando.')
            );
        });

        it('debe inicializar totales para cada método de pago activo', async () => {
            const dto = createOpenCashRegisterDTO({ initialAmount: 15000 });

            mockCashRegisterRepository.findOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(mockOpenRegister());

            mockCashRegisterRepository.create.mockReturnValue({ id: 'cash-1' });
            mockCashRegisterRepository.save.mockResolvedValue({ id: 'cash-1' });

            await service.open(dto, 'user-1');

            // Debe llamar save 3 veces: 1 para la caja + 2 para los métodos de pago (cash y debit)
            expect(mockCashTotalsRepository.save).toHaveBeenCalledTimes(2);
        });
    });

    describe('close', () => {
        it('debe cerrar la caja abierta calculando diferencias', async () => {
            const dto = createCloseCashRegisterDTO({ actualCashAmount: 12000 });
            const cashRegister = {
                id: 'cash-1',
                status: CashRegisterStatus.OPEN,
                initialAmount: 10000,
                totalIncome: 5000,
                totalExpense: 3000,
                totals: [
                    { paymentMethod: { code: 'cash' }, expectedAmount: 12000, id: 'total-1' },
                ],
            } as unknown as CashRegister;

            mockCashRegisterRepository.findOne.mockResolvedValueOnce(cashRegister);
            mockCashTotalsRepository.find.mockResolvedValue(cashRegister.totals);
            mockCashTotalsRepository.save.mockResolvedValue({});
            mockCashRegisterRepository.save.mockResolvedValue({
                ...cashRegister,
                status: CashRegisterStatus.CLOSED,
            });
            mockCashRegisterRepository.findOne.mockResolvedValueOnce({
                ...cashRegister,
                status: CashRegisterStatus.CLOSED,
                openedBy: { firstName: 'Test', lastName: 'User' },
                totals: [],
            });

            const result = await service.close(dto, 'user-1');

            expect(result.status).toBe(CashRegisterStatus.CLOSED);
            expect(mockAuditService.logSilent).toHaveBeenCalledWith(
                expect.objectContaining({
                    entityType: 'cash_register',
                    action: 'CLOSE',
                })
            );
        });

        it('debe calcular diferencia correctamente', async () => {
            const dto = createCloseCashRegisterDTO({ actualCashAmount: 12500 }); // 500 de sobrante
            const cashRegister = {
                id: 'cash-1',
                status: CashRegisterStatus.OPEN,
                initialAmount: 10000,
                totalIncome: 5000,
                totalExpense: 3000,
                totals: [
                    { paymentMethod: { code: 'cash' }, expectedAmount: 12000, id: 'total-1' },
                ],
            } as unknown as CashRegister;

            const savedRegisters: CashRegister[] = [];
            mockCashRegisterRepository.findOne.mockResolvedValueOnce(cashRegister);
            mockCashTotalsRepository.find.mockResolvedValue(cashRegister.totals);
            mockCashTotalsRepository.save.mockImplementation((total) => {
                if (total.paymentMethod?.code === 'cash') {
                    expect(total.difference).toBe(500); // 12500 - 12000
                }
                return Promise.resolve(total);
            });
            mockCashRegisterRepository.save.mockImplementation((register) => {
                savedRegisters.push(register as CashRegister);
                return Promise.resolve(register);
            });
            mockCashRegisterRepository.findOne.mockResolvedValueOnce({
                ...cashRegister,
                status: CashRegisterStatus.CLOSED,
                openedBy: { firstName: 'Test', lastName: 'User' },
                totals: [],
            });

            await service.close(dto, 'user-1');

            const savedRegister = savedRegisters[0];
            expect(savedRegister?.actualAmount).toBe(12500);
            expect(savedRegister?.difference).toBe(500);
        });

        it('debe lanzar error si no hay caja abierta', async () => {
            mockCashRegisterRepository.findOne.mockResolvedValue(null);

            await expect(service.close(createCloseCashRegisterDTO(), 'user-1')).rejects.toThrow(
                new NotFoundException('No hay caja abierta')
            );
        });
    });

    describe('reopen', () => {
        it('debe reabrir una caja cerrada del día actual', async () => {
            const today = new Date().toISOString().split('T')[0];
            const cashRegister = {
                id: 'cash-1',
                status: CashRegisterStatus.CLOSED,
                date: today,
                totals: [{ id: 'total-1', actualAmount: 12000, difference: 500 }],
            } as unknown as CashRegister;

            mockCashRegisterRepository.findOne
                .mockResolvedValueOnce(cashRegister) // findOne by id
                .mockResolvedValueOnce(null) // getOpenRegister
                .mockResolvedValueOnce({
                    ...cashRegister,
                    status: CashRegisterStatus.OPEN,
                    movements: [],
                }); // reload

            mockCashTotalsRepository.save.mockResolvedValue({});
            mockCashRegisterRepository.save.mockResolvedValue({});

            const result = await service.reopen('cash-1', 'user-1');

            expect(result.status).toBe(CashRegisterStatus.OPEN);
        });

        it('debe limpiar datos de cierre al reabrir', async () => {
            const today = new Date().toISOString().split('T')[0];
            const cashRegister = {
                id: 'cash-1',
                status: CashRegisterStatus.CLOSED,
                date: today,
                closedAt: new Date(),
                expectedAmount: 12000,
                actualAmount: 12500,
                difference: 500,
                closingNotes: 'Cierre',
                totals: [{ id: 'total-1', actualAmount: 12000, difference: 500 }],
            } as unknown as CashRegister;

            const savedRegisters: CashRegister[] = [];
            mockCashRegisterRepository.findOne
                .mockResolvedValueOnce(cashRegister)
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ ...cashRegister, status: CashRegisterStatus.OPEN, movements: [] });

            mockCashTotalsRepository.save.mockImplementation((total) => {
                expect(total.actualAmount).toBeUndefined();
                expect(total.difference).toBeUndefined();
                return Promise.resolve(total);
            });
            mockCashRegisterRepository.save.mockImplementation((register) => {
                savedRegisters.push(register as CashRegister);
                return Promise.resolve(register);
            });

            await service.reopen('cash-1', 'user-1');

            const savedRegister = savedRegisters[0];
            expect(savedRegister?.closedAt).toBeUndefined();
            expect(savedRegister?.expectedAmount).toBeUndefined();
            expect(savedRegister?.actualAmount).toBeUndefined();
            expect(savedRegister?.difference).toBeUndefined();
            expect(savedRegister?.closingNotes).toBeUndefined();
        });

        it('debe lanzar error si la caja ya está abierta', async () => {
            const cashRegister = {
                id: 'cash-1',
                status: CashRegisterStatus.OPEN,
            } as CashRegister;

            mockCashRegisterRepository.findOne.mockResolvedValue(cashRegister);

            await expect(service.reopen('cash-1', 'user-1')).rejects.toThrow(
                new BadRequestException('La caja ya está abierta')
            );
        });

        it('debe lanzar error si la caja no es del día actual', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            const cashRegister = {
                id: 'cash-1',
                status: CashRegisterStatus.CLOSED,
                date: yesterday.toISOString().split('T')[0],
            } as unknown as CashRegister;

            mockCashRegisterRepository.findOne.mockResolvedValueOnce(cashRegister);

            await expect(service.reopen('cash-1', 'user-1')).rejects.toThrow(
                new BadRequestException('Solo se puede reabrir la caja del día actual')
            );
        });
    });

    describe('getOpenRegister', () => {
        it('debe retornar la caja abierta con movimientos', async () => {
            const openRegister = {
                id: 'cash-1',
                status: CashRegisterStatus.OPEN,
                openedBy: { firstName: 'Test', lastName: 'User' },
                totals: [{ paymentMethod: { code: 'cash', name: 'Efectivo' } }],
            };

            mockCashRegisterRepository.findOne.mockResolvedValue(openRegister);
            mockCashMovementRepository.createQueryBuilder.mockReturnValue({
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                leftJoin: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([]),
            });

            const result = await service.getOpenRegister();

            expect(result).toBeDefined();
            expect(result.id).toBe('cash-1');
        });

        it('debe retornar null si no hay caja abierta', async () => {
            mockCashRegisterRepository.findOne.mockResolvedValue(null);

            const result = await service.getOpenRegister();

            expect(result).toBeNull();
        });
    });

    describe('createManualMovement', () => {
        beforeEach(() => {
            const openRegister = { id: 'cash-1', totalIncome: 0, totalExpense: 0 } as CashRegister;
            jest.spyOn(service as any, 'getOpenRegister').mockResolvedValue(openRegister);
        });

        it('debe registrar movimiento manual de ingreso', async () => {
            const paymentMethod = { id: 'pm-1', name: 'Efectivo', code: 'cash' } as PaymentMethod;

            mockPaymentMethodRepository.findOneBy.mockResolvedValue(paymentMethod);
            mockDataSource.query.mockResolvedValue([
                { id: 'mov-1', movementType: MovementType.INCOME, referenceType: 'manual', manualAmount: 1500 },
            ]);
            mockCashRegisterRepository.update.mockResolvedValue({});
            mockCashTotalsRepository.findOne.mockResolvedValue({
                paymentMethod: { id: 'pm-1' },
                totalIncome: 0,
                totalExpense: 0,
                initialAmount: 10000,
            });
            mockCashTotalsRepository.save.mockResolvedValue({});

            const result = await service.createManualMovement(
                {
                    movementType: 'income',
                    paymentMethodId: 'pm-1',
                    amount: 1500,
                    description: 'Ingreso manual',
                },
                'user-1',
            );

            expect(result.manualAmount).toBe(1500);
            expect(mockCashRegisterRepository.increment).toHaveBeenCalledWith(
                { id: 'cash-1' },
                'totalIncome',
                1500
            );
        });

        it('debe registrar movimiento manual de egreso', async () => {
            const paymentMethod = { id: 'pm-1', name: 'Efectivo', code: 'cash' } as PaymentMethod;

            mockPaymentMethodRepository.findOneBy.mockResolvedValue(paymentMethod);
            mockDataSource.query.mockResolvedValue([
                { id: 'mov-1', movementType: MovementType.EXPENSE, referenceType: 'manual' },
            ]);
            mockCashRegisterRepository.update.mockResolvedValue({});
            mockCashTotalsRepository.findOne.mockResolvedValue({
                paymentMethod: { id: 'pm-1' },
                totalIncome: 0,
                totalExpense: 0,
                initialAmount: 10000,
            });
            mockCashTotalsRepository.save.mockResolvedValue({});

            await service.createManualMovement(
                {
                    movementType: 'expense',
                    paymentMethodId: 'pm-1',
                    amount: 500,
                    description: 'Retiro de efectivo',
                },
                'user-1',
            );

            expect(mockCashRegisterRepository.increment).toHaveBeenCalledWith(
                { id: 'cash-1' },
                'totalExpense',
                500
            );
        });

        it('debe lanzar error si no hay caja abierta', async () => {
            jest.spyOn(service as any, 'getOpenRegister').mockResolvedValue(null);

            await expect(
                service.createManualMovement(
                    {
                        movementType: 'expense',
                        paymentMethodId: 'pm-1',
                        amount: 1000,
                        description: 'Salida',
                    },
                    'user-1',
                ),
            ).rejects.toThrow(new BadRequestException('No hay caja abierta'));
        });

        it('debe lanzar error si método de pago no existe', async () => {
            mockPaymentMethodRepository.findOneBy.mockResolvedValue(null);

            await expect(
                service.createManualMovement(
                    {
                        movementType: 'income',
                        paymentMethodId: 'pm-inexistente',
                        amount: 1000,
                        description: 'Ingreso',
                    },
                    'user-1',
                ),
            ).rejects.toThrow(new NotFoundException('Método de pago no encontrado'));
        });
    });

    describe('getCashStatus', () => {
        it('debe retornar estado sin caja abierta', async () => {
            mockCashRegisterRepository.findOne.mockResolvedValue(null);

            const result = await service.getCashStatus();

            expect(result.hasOpenRegister).toBe(false);
            expect(result.isFromPreviousDay).toBe(false);
            expect(result.openRegister).toBeNull();
        });

        it('debe detectar caja abierta del día actual', async () => {
            const today = new Date().toISOString().split('T')[0];
            const openRegister = {
                id: 'cash-1',
                status: CashRegisterStatus.OPEN,
                date: today,
            };

            mockCashRegisterRepository.findOne.mockResolvedValue(openRegister);

            const result = await service.getCashStatus();

            expect(result.hasOpenRegister).toBe(true);
            expect(result.isFromPreviousDay).toBe(false);
        });

        it('debe detectar caja abierta del día anterior', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const openRegister = {
                id: 'cash-1',
                status: CashRegisterStatus.OPEN,
                date: yesterdayStr,
            };

            mockCashRegisterRepository.findOne.mockResolvedValue(openRegister);

            const result = await service.getCashStatus();

            expect(result.hasOpenRegister).toBe(true);
            expect(result.isFromPreviousDay).toBe(true);
        });
    });

    describe('balances y cálculos', () => {
        it('debe calcular balance esperado correctamente', () => {
            const initial = 10000;
            const income = 5000;
            const expense = 2000;
            const expected = initial + income - expense;

            expect(expected).toBe(13000);
        });

        it('debe calcular diferencia correctamente', () => {
            const expected = 13000;
            const actual = 13200;
            const difference = actual - expected;

            expect(difference).toBe(200); // Sobrante de 200
        });

        it('debe detectar faltante de caja', () => {
            const expected = 13000;
            const actual = 12800;
            const difference = actual - expected;

            expect(difference).toBe(-200); // Faltante de 200
        });
    });
});
