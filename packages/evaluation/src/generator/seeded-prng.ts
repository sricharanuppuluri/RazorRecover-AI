/**
 * Deterministic Seeded Pseudo-Random Number Generator (Mulberry32)
 * Guarantees 100% reproducible synthetic dataset generation and evaluation splits.
 */
export class SeededPRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a pseudo-random floating-point number in range [0, 1)
   */
  public nextFloat(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer in range [min, max] (inclusive)
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min + 1)) + min;
  }

  /**
   * Selects a random element from an array
   */
  public choice<T>(array: T[]): T {
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * Selects a weighted choice from an array of items with associated weights
   */
  public weightedChoice<T>(items: { item: T; weight: number }[]): T {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let r = this.nextFloat() * totalWeight;
    for (const entry of items) {
      if (r < entry.weight) {
        return entry.item;
      }
      r -= entry.weight;
    }
    return items[items.length - 1].item;
  }
}
