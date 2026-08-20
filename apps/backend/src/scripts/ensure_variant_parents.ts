import AppDataSource from '../data-source';
import { Product } from '../modules/products/entities/product.entity';

async function run() {
    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }
        const result = await AppDataSource.createQueryBuilder()
            .update(Product)
            .set({ isVariantParent: true })
            .where('season IS NOT NULL OR collection IS NOT NULL OR name LIKE :pattern', { pattern: 'Remera E2E%' })
            .execute();
        console.log('Updated variant parents:', result.affected);
    } catch (e) {
        console.error('Error updating variant parents:', e);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

run();
