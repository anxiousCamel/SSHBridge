/** @file LRU simples*/
export class LRU<K, V> {
  private map = new Map<K, V>();
  constructor(private capacity: number) {
    if (capacity <= 0) throw new Error("LRU capacity must be > 0");
  }

  /** Obtém valor e move a chave para o fim (mais recente). */
  get(key: K): V | undefined {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  /** Insere/atualiza valor; remove o mais antigo se passar da capacidade. */
  set(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
  }

  /** Remove uma chave. */
  delete(key: K): void {
    this.map.delete(key);
  }

  /** Limpa tudo. */
  clear(): void {
    this.map.clear();
  }

  /** Tamanho atual. */
  size(): number {
    return this.map.size;
  }
}
