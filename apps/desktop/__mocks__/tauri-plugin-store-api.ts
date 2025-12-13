export class Store {
  path: string;
  data: Record<string, unknown>;

  constructor(path: string) {
    this.path = path;
    this.data = {};
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data[key] = value;
  }

  async get(key: string): Promise<unknown> {
    return this.data[key] || null;
  }

  async has(key: string): Promise<boolean> {
    return Object.prototype.hasOwnProperty.call(this.data, key);
  }

  async delete(key: string): Promise<boolean> {
    const exists = Object.prototype.hasOwnProperty.call(this.data, key);
    delete this.data[key];
    return exists;
  }

  async clear(): Promise<void> {
    this.data = {};
  }

  async reset(): Promise<void> {
    this.data = {};
  }

  async keys(): Promise<string[]> {
    return Object.keys(this.data);
  }

  async values(): Promise<unknown[]> {
    return Object.values(this.data);
  }

  async entries(): Promise<[string, unknown][]> {
    return Object.entries(this.data);
  }

  async length(): Promise<number> {
    return Object.keys(this.data).length;
  }

  async load(): Promise<void> {
    // Mock load
  }

  async save(): Promise<void> {
    // Mock save
  }

  async onKeyChange(_key: string, _cb: (value: unknown) => void): Promise<() => void> {
    return () => {};
  }

  async onChange(_cb: (key: string, value: unknown) => void): Promise<() => void> {
    return () => {};
  }
}
