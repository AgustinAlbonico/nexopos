import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CashRegisterService } from '../modules/cash-register/cash-register.service';

async function testOpenRegister() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(CashRegisterService);

    const open = await service.getOpenRegister();
    console.log('Open Register in Backend:', open?.id, 'Status:', open?.status);

    await app.close();
}

testOpenRegister().catch(console.error);
