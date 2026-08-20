import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ProductsService } from '../modules/products/products.service';
import { ConfigurationService } from '../modules/configuration/configuration.service';

async function test() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(ProductsService);
    const configService = app.get(ConfigurationService);

    // Asegurar perfil indumentaria ('apparel')
    await configService.setProfile('apparel');

    // 1. Crear producto
    const parent = await service.create({
        name: 'Remera Test ts-node',
        price: 12000,
        cost: 6000,
        stock: 0,
        useManualPrice: true,
    } as any);

    console.log('Parent creado ID:', parent.id);
    console.log('Parent isVariantParent inicial:', parent.isVariantParent);

    // 2. Generar variantes sin marcar previamente isVariantParent
    const variants = await service.generateVariants(parent.id, {
        Talle: ['S', 'M', 'L'],
        Color: ['Negro', 'Blanco']
    });

    console.log('Variantes generadas exitosamente. Total:', variants.length);
    console.log('Ejemplo Variante:', variants[0].name, 'Attributes:', variants[0].variantAttributes);

    await app.close();
}

test().catch(console.error);
