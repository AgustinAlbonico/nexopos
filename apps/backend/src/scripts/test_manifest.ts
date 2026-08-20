import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConfigurationService } from '../modules/configuration/configuration.service';

async function testManifest() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(ConfigurationService);

    const manifest = await service.getCapabilitiesManifest();
    console.log('Profile key in backend:', manifest.profileKey);
    console.log('STRUCTURAL.variants:', (manifest.capabilities as any)['STRUCTURAL.variants']);

    await app.close();
}

testManifest().catch(console.error);
