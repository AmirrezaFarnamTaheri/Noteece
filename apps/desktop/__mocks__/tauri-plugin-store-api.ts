export class Store {
  path: string;
  data: Record<string, any>;

  constructor(path: string) {
    this.path = path;
    this.data = {};
  }

  async set(key: string, value: any): Promise<void> {
    this.data[key] = value;
  }

  async get(key: string): Promise<any> {
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

  async values(): Promise<any[]> {
    return Object.values(this.data);
  }

  async entries(): Promise<[string, any][]> {
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

  async onKeyChange(key: string, cb: (value: any) => void): Promise<() => void> {
    return () => {};
  }

  async onChange(cb: (key: string, value: any) => void): Promise<() => void> {
    return () => {};
  }
}
