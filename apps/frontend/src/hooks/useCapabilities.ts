import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { api } from '@/lib/axios';

/**
 * Manifest de capacidades expuesto por `GET /api/configuration/manifest`.
 * Mientras el endpoint no exista (worktrees tempranos), el hook cae al
 * defaultManifest y devuelve `STRUCTURAL.variants: true` para no bloquear
 * features en dev. Cuando el endpoint exista, el `parse` lo toma del response.
 */
const capabilitiesManifestSchema = z.object({
    profileKey: z.string(),
    profileVersion: z.number().int(),
    capabilitiesSchemaVersion: z.number().int(),
    capabilities: z.record(z.boolean()),
    appRoutes: z.object({
        enabled: z.array(z.string()),
        disabled: z.array(z.string()),
    }),
    onboardingCompleted: z.boolean().optional().default(false),
    selectedBusinessType: z.string().nullable().optional().default(null),
});

export type CapabilitiesManifest = Readonly<z.infer<typeof capabilitiesManifestSchema>>;

const defaultManifest: CapabilitiesManifest = {
    profileKey: 'simple-retail',
    profileVersion: 1,
    capabilitiesSchemaVersion: 1,
    capabilities: {
        'STRUCTURAL.variants': true,
        'STRUCTURAL.weight': false,
        'STRUCTURAL.expiry': false,
    },
    appRoutes: { enabled: [], disabled: [] },
    onboardingCompleted: false,
    selectedBusinessType: null,
};

export function useCapabilities(enabled = true) {
    const query = useQuery({
        queryKey: ['configuration', 'capabilities'],
        queryFn: async (): Promise<CapabilitiesManifest> => {
            try {
                const response = await api.get('/api/configuration/manifest');
                return capabilitiesManifestSchema.parse(response.data);
            } catch {
                // Endpoint aún no expuesto (worktrees sin capabilities.controller);
                // caemos al default. Cuando el endpoint exista, esto deja de aplicar.
                return defaultManifest;
            }
        },
        staleTime: 5 * 60 * 1000,
        enabled,
    });

    return {
        data: query.data ?? defaultManifest,
        isLoading: query.isLoading,
        isError: query.isError,
    };
}