import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSizeScaleAndColorPaletteTemplates1786405840960 implements MigrationInterface {
    name = 'AddSizeScaleAndColorPaletteTemplates1786405840960';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Crear tabla size_scale_templates
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "size_scale_templates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(100) NOT NULL,
                "category" varchar(50) NULL,
                "sizes" jsonb NOT NULL,
                "is_system_preset" boolean NOT NULL DEFAULT false,
                "sort_order" integer NOT NULL DEFAULT 0,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_size_scale_templates_name" UNIQUE ("name"),
                CONSTRAINT "PK_size_scale_templates" PRIMARY KEY ("id")
            );
        `);

        // 2. Crear tabla color_palette_templates
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "color_palette_templates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" varchar(100) NOT NULL,
                "colors" jsonb NOT NULL,
                "is_system_preset" boolean NOT NULL DEFAULT false,
                "sort_order" integer NOT NULL DEFAULT 0,
                "created_at" timestamp NOT NULL DEFAULT now(),
                "updated_at" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_color_palette_templates_name" UNIQUE ("name"),
                CONSTRAINT "PK_color_palette_templates" PRIMARY KEY ("id")
            );
        `);

        // 3. Sembrar presets del sistema para talles
        await queryRunner.query(`
            INSERT INTO "size_scale_templates" ("name", "category", "sizes", "is_system_preset", "sort_order")
            VALUES 
                ('Adultos (XS-XXL)', 'apparel', '["XS", "S", "M", "L", "XL", "XXL"]'::jsonb, true, 1),
                ('Jeans / Pantalones (38-50)', 'apparel', '["38", "40", "42", "44", "46", "48", "50"]'::jsonb, true, 2),
                ('Calzado Adulto (37-44)', 'footwear', '["37", "38", "39", "40", "41", "42", "43", "44"]'::jsonb, true, 3),
                ('Niños (4-14)', 'kids', '["4", "6", "8", "10", "12", "14"]'::jsonb, true, 4),
                ('Bebés (0M-18M)', 'babies', '["0M", "3M", "6M", "9M", "12M", "18M"]'::jsonb, true, 5)
            ON CONFLICT ("name") DO NOTHING;
        `);

        // 4. Sembrar presets del sistema para colores
        await queryRunner.query(`
            INSERT INTO "color_palette_templates" ("name", "colors", "is_system_preset", "sort_order")
            VALUES 
                ('Básicos Neutros', '[{"name": "Negro", "hex": "#18181b"}, {"name": "Blanco", "hex": "#ffffff", "border": true}, {"name": "Gris Melange", "hex": "#94a3b8"}, {"name": "Azul Marino", "hex": "#1e3a8a"}]'::jsonb, true, 1),
                ('Tonos Cálidos', '[{"name": "Rojo", "hex": "#dc2626"}, {"name": "Bordó", "hex": "#881337"}, {"name": "Naranja", "hex": "#ea580c"}, {"name": "Mostaza", "hex": "#ca8a04"}]'::jsonb, true, 2),
                ('Tonos Fríos & Tierra', '[{"name": "Verde Militar", "hex": "#3f6212"}, {"name": "Verde Oliva", "hex": "#65a30d"}, {"name": "Beige / Crudo", "hex": "#d4b996"}, {"name": "Marrón / Chocolate", "hex": "#451a03"}]'::jsonb, true, 3),
                ('Pasteles & Verano', '[{"name": "Rosa Pastel", "hex": "#f472b6"}, {"name": "Celeste Pastel", "hex": "#38bdf8"}, {"name": "Lila / Lavanda", "hex": "#c084fc"}, {"name": "Amarillo Pastel", "hex": "#fef08a"}]'::jsonb, true, 4)
            ON CONFLICT ("name") DO NOTHING;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "color_palette_templates";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "size_scale_templates";`);
    }
}
