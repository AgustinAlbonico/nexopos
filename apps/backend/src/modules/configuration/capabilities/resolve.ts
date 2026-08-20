import { ALL_CAPABILITY_KEYS, type CapabilityKey, type CapabilityMap, isCapabilityKey } from './keys';
import {
    CAPABILITY_PRESETS,
    CURRENT_CAPABILITIES_SCHEMA_VERSION,
    isCapabilityProfileKey,
} from './presets';

export type ResolveCapabilitiesResult =
    | { readonly ok: true; readonly capabilities: CapabilityMap }
    | { readonly ok: false; readonly errors: readonly string[] };

export function resolveCapabilities(
    profileKey: unknown,
    overrides: unknown,
    capabilitiesSchemaVersion: unknown,
): ResolveCapabilitiesResult {
    const errors: string[] = [];
    const resolvedProfileKey = typeof profileKey === 'string' && isCapabilityProfileKey(profileKey)
        ? profileKey
        : null;

    if (capabilitiesSchemaVersion !== CURRENT_CAPABILITIES_SCHEMA_VERSION) {
        errors.push(`capabilitiesSchemaVersion must be ${CURRENT_CAPABILITIES_SCHEMA_VERSION}`);
    }

    if (resolvedProfileKey === null) {
        errors.push('profileKey must be a known capability profile');
    }

    if (!isStringRecord(overrides)) {
        errors.push('capabilities must be an object');
        return { ok: false, errors };
    }

    for (const key of Object.keys(overrides).sort()) {
        const value = overrides[key];
        if (!isCapabilityKey(key)) {
            errors.push(`capabilities.${key} is not a known capability key`);
            continue;
        }
        if (typeof value !== 'boolean') {
            errors.push(`capabilities.${key} must be boolean`);
        }
    }

    if (errors.length > 0 || resolvedProfileKey === null) {
        return { ok: false, errors };
    }

    const capabilities: Record<CapabilityKey, boolean> = { ...CAPABILITY_PRESETS[resolvedProfileKey] };
    for (const key of ALL_CAPABILITY_KEYS) {
        const value = overrides[key];
        if (typeof value === 'boolean') {
            capabilities[key] = value;
        }
    }

    return { ok: true, capabilities };
}

function isStringRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
