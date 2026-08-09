const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

export function formatRupiah(
    value: number | string | null | undefined,
): string {
    const amount = Number(value ?? 0);

    return rupiahFormatter.format(Number.isFinite(amount) ? amount : 0);
}
