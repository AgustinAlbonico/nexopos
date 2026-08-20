import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function ensureOpenCash() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    // 1. Cerrar cajas de días anteriores
    await dataSource.query(`UPDATE cash_registers SET status = 'closed', "closedAt" = NOW() WHERE status = 'open' AND "openedAt" < CURRENT_DATE`);
    
    // 2. Si existe una caja hoy (abierta o cerrada), asegurarnos de que esté ABIERTA
    const todayRegisters = await dataSource.query(`SELECT id FROM cash_registers WHERE "openedAt" >= CURRENT_DATE LIMIT 1`);

    if (todayRegisters.length > 0) {
        await dataSource.query(`UPDATE cash_registers SET status = 'open', "closedAt" = NULL WHERE id = '${todayRegisters[0].id}'`);
        console.log('Caja de hoy asegurada como ABIERTA.');
    } else {
        const adminUsers = await dataSource.query(`SELECT id FROM users WHERE username = 'admin' LIMIT 1`);
        if (adminUsers[0]?.id) {
            await dataSource.query(`
                INSERT INTO cash_registers (id, date, "openedAt", "initialAmount", "actualAmount", status, "opened_by")
                VALUES (gen_random_uuid(), CURRENT_DATE, NOW(), 10000, 10000, 'open', '${adminUsers[0].id}')
            `);
            console.log('Nueva caja para hoy creada y ABIERTA.');
        }
    }

    await app.close();
}

ensureOpenCash().catch(console.error);
