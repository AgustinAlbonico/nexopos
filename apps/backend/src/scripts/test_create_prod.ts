import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductsService } from '../modules/products/products.service';

async function testCreate() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(ProductsService);

    try {
        const prod = await service.create({
            name: 'Remera Test Manual Direct',
            price: 18500,
            useManualPrice: true,
            season: 'Primavera-Verano 2026',
            collection: 'Cápsula E2E',
            isVariantParent: true,
        } as any);

        console.log('Producto creado con éxito ID:', prod.id);
        console.log('isVariantParent:', prod.isVariantParent);
        console.log('season:', prod.season);
        console.log('collection:', prod.collection);
    } catch (err) {
        console.error('Error en service.create:', err);
    }

    await app.close();
}

testCreate().catch(console.error);
