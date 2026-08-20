import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function resetCashRegisters() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    // Cerrar cajas del día anterior para evitar alertas bloqueantes en la UI
    await dataSource.query(`UPDATE cash_registers SET status = 'closed', "closedAt" = NOW() WHERE status = 'open' AND "openedAt" < CURRENT_DATE`);
    
    console.log('Cajas del día anterior cerradas correctamente en DB.');
    await app.close();
}

resetCashRegisters().catch(console.error);
