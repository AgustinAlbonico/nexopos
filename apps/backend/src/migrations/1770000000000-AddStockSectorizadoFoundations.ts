import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migración: AddStockSectorizadoFoundations
 *
 * Crea las tablas que sostienen el modo sectorizado opcional:
 *  - locations (con flags isPrimarySale / isDefaultReceive, a lo sumo uno true cada uno)
 *  - product_location_stocks (saldo por par producto/ubicación, único)
 *  - stock_transfers (auditoría de traslados entre ubicaciones)
 *
 * No agrega columnas a stock_movements ni a system_configuration: esos cambios
 * llegan en migraciones posteriores para mantener el PR1 dentro del scope
 * "foundations".
 */
export class AddStockSectorizadoFoundations1770000000000 implements MigrationInterface {
    name = 'AddStockSectorizadoFoundations1770000000000'

    private async tableExists(queryRunner: QueryRunner, tableName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = '${tableName}'
            )
        `);
        return result[0]?.exists || false;
    }

    private async columnExists(queryRunner: QueryRunner, tableName: string, columnName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = '${tableName}'
                AND column_name = '${columnName}'
            )
        `);
        return result[0]?.exists || false;
    }

    private async indexExists(queryRunner: QueryRunner, indexName: string): Promise<boolean> {
        const result = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE schemaname = 'public'
                AND indexname = '${indexName}'
            )
        `);
        return result[0]?.exists || false;
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Tabla locations
        if (!await this.tableExists(queryRunner, 'locations')) {
            await queryRunner.query(`
                CREATE TABLE "locations" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "name" character varying(120) NOT NULL,
                    "function" varchar NOT NULL DEFAULT 'STORAGE',
                    "isActive" boolean NOT NULL DEFAULT true,
                    "isPrimarySale" boolean NOT NULL DEFAULT false,
                    "isDefaultReceive" boolean NOT NULL DEFAULT false,
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_locations" PRIMARY KEY ("id")
                )
            `);

            // name único
            if (!await this.indexExists(queryRunner, 'UQ_locations_name')) {
                await queryRunner.query(`
                    CREATE UNIQUE INDEX "UQ_locations_name"
                    ON "locations" ("name")
                `);
            }

            // A lo sumo una ubicación primaria de venta.
            if (!await this.indexExists(queryRunner, 'UQ_locations_primary_sale')) {
                await queryRunner.query(`
                    CREATE UNIQUE INDEX "UQ_locations_primary_sale"
                    ON "locations" ("isPrimarySale")
                    WHERE "isPrimarySale" = true
                `);
            }

            // A lo sumo una ubicación destino predeterminado de compras.
            if (!await this.indexExists(queryRunner, 'UQ_locations_default_receive')) {
                await queryRunner.query(`
                    CREATE UNIQUE INDEX "UQ_locations_default_receive"
                    ON "locations" ("isDefaultReceive")
                    WHERE "isDefaultReceive" = true
                `);
            }
        }

        // 2. Tabla product_location_stocks
        if (!await this.tableExists(queryRunner, 'product_location_stocks')) {
            await queryRunner.query(`
                CREATE TABLE "product_location_stocks" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "productId" uuid NOT NULL,
                    "locationId" uuid NOT NULL,
                    "quantity" numeric(14,3) NOT NULL DEFAULT 0,
                    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_product_location_stocks" PRIMARY KEY ("id"),
                    CONSTRAINT "UQ_product_location_stocks_product_location"
                        UNIQUE ("productId", "locationId"),
                    CONSTRAINT "FK_product_location_stocks_product"
                        FOREIGN KEY ("productId") REFERENCES "products"("id")
                        ON DELETE RESTRICT ON UPDATE NO ACTION,
                    CONSTRAINT "FK_product_location_stocks_location"
                        FOREIGN KEY ("locationId") REFERENCES "locations"("id")
                        ON DELETE RESTRICT ON UPDATE NO ACTION
                )
            `);

            if (!await this.indexExists(queryRunner, 'IDX_product_location_stocks_product')) {
                await queryRunner.query(`
                    CREATE INDEX "IDX_product_location_stocks_product"
                    ON "product_location_stocks" ("productId")
                `);
            }

            if (!await this.indexExists(queryRunner, 'IDX_product_location_stocks_location')) {
                await queryRunner.query(`
                    CREATE INDEX "IDX_product_location_stocks_location"
                    ON "product_location_stocks" ("locationId")
                `);
            }
        }

        // 3. Tabla stock_transfers
        if (!await this.tableExists(queryRunner, 'stock_transfers')) {
            await queryRunner.query(`
                CREATE TABLE "stock_transfers" (
                    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                    "productId" uuid NOT NULL,
                    "fromLocationId" uuid NOT NULL,
                    "toLocationId" uuid NOT NULL,
                    "quantity" numeric(14,3) NOT NULL,
                    "reason" character varying(255),
                    "createdById" uuid,
                    "status" varchar NOT NULL DEFAULT 'COMPLETADO',
                    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_stock_transfers" PRIMARY KEY ("id"),
                    CONSTRAINT "CHK_stock_transfers_quantity_positive" CHECK ("quantity" > 0),
                    CONSTRAINT "CHK_stock_transfers_different_locations"
                        CHECK ("fromLocationId" <> "toLocationId"),
                    CONSTRAINT "FK_stock_transfers_product"
                        FOREIGN KEY ("productId") REFERENCES "products"("id")
                        ON DELETE RESTRICT ON UPDATE NO ACTION,
                    CONSTRAINT "FK_stock_transfers_from_location"
                        FOREIGN KEY ("fromLocationId") REFERENCES "locations"("id")
                        ON DELETE RESTRICT ON UPDATE NO ACTION,
                    CONSTRAINT "FK_stock_transfers_to_location"
                        FOREIGN KEY ("toLocationId") REFERENCES "locations"("id")
                        ON DELETE RESTRICT ON UPDATE NO ACTION
                )
            `);

            if (!await this.indexExists(queryRunner, 'IDX_stock_transfers_product')) {
                await queryRunner.query(`
                    CREATE INDEX "IDX_stock_transfers_product"
                    ON "stock_transfers" ("productId")
                `);
            }

            if (!await this.indexExists(queryRunner, 'IDX_stock_transfers_from')) {
                await queryRunner.query(`
                    CREATE INDEX "IDX_stock_transfers_from"
                    ON "stock_transfers" ("fromLocationId")
                `);
            }

            if (!await this.indexExists(queryRunner, 'IDX_stock_transfers_to')) {
                await queryRunner.query(`
                    CREATE INDEX "IDX_stock_transfers_to"
                    ON "stock_transfers" ("toLocationId")
                `);
            }

            if (!await this.indexExists(queryRunner, 'IDX_stock_transfers_created_at')) {
                await queryRunner.query(`
                    CREATE INDEX "IDX_stock_transfers_created_at"
                    ON "stock_transfers" ("createdAt" DESC)
                `);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar en orden inverso: stock_transfers → product_location_stocks → locations.

        // 3. stock_transfers
        if (await this.tableExists(queryRunner, 'stock_transfers')) {
            await queryRunner.query(`DROP TABLE "stock_transfers"`);
        }

        // 2. product_location_stocks
        if (await this.tableExists(queryRunner, 'product_location_stocks')) {
            await queryRunner.query(`DROP TABLE "product_location_stocks"`);
        }

        // 1. locations
        if (await this.tableExists(queryRunner, 'locations')) {
            await queryRunner.query(`DROP TABLE "locations"`);
        }
    }
}
