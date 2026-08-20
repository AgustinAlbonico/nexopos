export type ScaleReadResult =
    | { readonly ok: true; readonly quantity: number }
    | { readonly ok: false; readonly reason: 'timeout' | 'unstable' | 'corrupt' };
