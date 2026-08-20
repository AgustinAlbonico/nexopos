import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ReportsService } from '../modules/reports/reports.service';

async function debug() {
    try {
        const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
        const reportsService = app.get(ReportsService);

        console.log('Testing getApparelMetrics()...');
        try {
            const apparel = await reportsService.getApparelMetrics();
            console.log('Apparel success:', apparel);
        } catch (err) {
            console.error('getApparelMetrics error:', err);
        }

        console.log('Testing getSellerCommissions()...');
        try {
            const comm = await reportsService.getSellerCommissions();
            console.log('SellerCommissions success:', comm);
        } catch (err) {
            console.error('getSellerCommissions error:', err);
        }

        await app.close();
    } catch (e) {
        console.error('App init error:', e);
    }
}

debug();
