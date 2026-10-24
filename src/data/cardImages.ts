export const CardImages = {
  primaryUrl(set: string, number: number | string): string {
    const numInt = typeof number === 'string' ? parseInt(number, 10) : number;
    const code = set === 'PROMO-A' ? 'P-A' : set === 'PROMO-B' ? 'P-B' : set;
    const num = isNaN(numInt) ? '001' : numInt.toString().padStart(3, '0');
    return `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${code}/${code}_${num}_EN.webp`;
  },

  fallbackUrls(set: string, number: number | string): string[] {
    const numInt = typeof number === 'string' ? parseInt(number, 10) : number;
    const code = set === 'PROMO-A' ? 'P-A' : set === 'PROMO-B' ? 'P-B' : set;
    const num = isNaN(numInt) ? '001' : numInt.toString().padStart(3, '0');
    const primary = this.primaryUrl(set, number);

    return Array.from(
      new Set([
        primary,
        `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${code}/${code}_${num}_EN_SM.webp`,
        `https://cdn.jsdelivr.net/gh/flibustier/pokemon-tcg-pocket-database@main/dist/cards-by-set/${set}/${numInt}.webp`,
        `https://cdn.jsdelivr.net/npm/pokemon-tcg-pocket-database/dist/cards-by-set/${set}/${numInt}.webp`,
      ])
    );
  },
};
