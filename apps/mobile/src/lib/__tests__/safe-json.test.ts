/**
 * Safe JSON Utilities Tests
 */

import { safeJsonParse, safeJsonParseWithValidation, safeJsonStringify, isJsonObject, isJsonArray } from '../safe-json';

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    const result = safeJsonParse('{"key": "value"}', {});
    expect(result).toEqual({ key: 'value' });
  });

  it('should return default value for null input', () => {
    const defaultValue = { default: true };
    const result = safeJsonParse(null, defaultValue);
    expect(result).toBe(defaultValue);
  });

  it('should return default value for undefined input', () => {
    const defaultValue = { default: true };
    const result = safeJsonParse(undefined, defaultValue);
    expect(result).toBe(defaultValue);
  });

  it('should return default value for invalid JSON', () => {
    const defaultValue = { default: true };
    const result = safeJsonParse('invalid json', defaultValue);
    expect(result).toBe(defaultValue);
  });

  it('should return default value for empty string', () => {
    const defaultValue = { default: true };
    const result = safeJsonParse('', defaultValue);
    expect(result).toBe(defaultValue);
  });

  it('should parse arrays', () => {
    const result = safeJsonParse('[1, 2, 3]', []);
    expect(result).toEqual([1, 2, 3]);
  });

  it('should parse nested objects', () => {
    const json = '{"nested": {"key": "value"}}';
    const result = safeJsonParse(json, {});
    expect(result).toEqual({ nested: { key: 'value' } });
  });

  it('should handle malformed JSON gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = safeJsonParse('{"unclosed": ', {});
    expect(result).toEqual({});
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should not log errors when logError is false', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = safeJsonParse('invalid', {}, false);
    expect(result).toEqual({});
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('safeJsonParseWithValidation', () => {
  interface User {
    name: string;
    age: number;
  }

  const isUser = (data: unknown): data is User => {
    return (
      typeof data === 'object' &&
      data !== null &&
      'name' in data &&
      'age' in data &&
      typeof (data as User).name === 'string' &&
      typeof (data as User).age === 'number'
    );
  };

  it('should parse and validate valid data', () => {
    const json = '{"name": "John", "age": 30}';
    const defaultValue: User = { name: '', age: 0 };
    const result = safeJsonParseWithValidation(json, isUser, defaultValue);
    expect(result).toEqual({ name: 'John', age: 30 });
  });

  it('should return default for invalid data', () => {
    const json = '{"name": "John"}'; // missing age
    const defaultValue: User = { name: 'Unknown', age: 0 };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = safeJsonParseWithValidation(json, isUser, defaultValue);
    expect(result).toBe(defaultValue);
    consoleSpy.mockRestore();
  });

  it('should return default for malformed JSON', () => {
    const json = 'invalid json';
    const defaultValue: User = { name: 'Unknown', age: 0 };
    const result = safeJsonParseWithValidation(json, isUser, defaultValue);
    expect(result).toBe(defaultValue);
  });
});

describe('safeJsonStringify', () => {
  it('should stringify valid objects', () => {
    const obj = { key: 'value' };
    const result = safeJsonStringify(obj);
    expect(result).toBe('{"key":"value"}');
  });

  it('should stringify arrays', () => {
    const arr = [1, 2, 3];
    const result = safeJsonStringify(arr);
    expect(result).toBe('[1,2,3]');
  });

  it('should return default for circular references', () => {
    const obj: any = { key: 'value' };
    obj.self = obj; // create circular reference

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = safeJsonStringify(obj, '{}');
    expect(result).toBe('{}');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle undefined', () => {
    const result = safeJsonStringify(undefined);
    expect(result).toBe('{}');
  });

  it('should use custom default value', () => {
    const obj: any = { key: 'value' };
    obj.self = obj;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = safeJsonStringify(obj, '[]');
    expect(result).toBe('[]');
    consoleSpy.mockRestore();
  });
});

describe('isJsonObject', () => {
  it('should return true for plain objects', () => {
    expect(isJsonObject({})).toBe(true);
    expect(isJsonObject({ key: 'value' })).toBe(true);
  });

  it('should return false for arrays', () => {
    expect(isJsonObject([])).toBe(false);
    expect(isJsonObject([1, 2, 3])).toBe(false);
  });

  it('should return false for null', () => {
    expect(isJsonObject(null)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isJsonObject('string')).toBe(false);
    expect(isJsonObject(123)).toBe(false);
    expect(isJsonObject(true)).toBe(false);
    expect(isJsonObject(undefined)).toBe(false);
  });
});

describe('isJsonArray', () => {
  it('should return true for arrays', () => {
    expect(isJsonArray([])).toBe(true);
    expect(isJsonArray([1, 2, 3])).toBe(true);
  });

  it('should return false for objects', () => {
    expect(isJsonArray({})).toBe(false);
    expect(isJsonArray({ key: 'value' })).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isJsonArray('string')).toBe(false);
    expect(isJsonArray(123)).toBe(false);
    expect(isJsonArray(null)).toBe(false);
    expect(isJsonArray(undefined)).toBe(false);
  });
});

describe('Real-world scenarios', () => {
  it('should handle corrupted localStorage data', () => {
    const corruptedData = '{"key": "value", "broken';
    const result = safeJsonParse(corruptedData, { fallback: true });
    expect(result).toEqual({ fallback: true });
  });

  it('should handle API responses with unexpected format', () => {
    interface ApiResponse {
      success: boolean;
      data: unknown;
    }

    const isApiResponse = (data: unknown): data is ApiResponse => {
      return typeof data === 'object' && data !== null && 'success' in data && 'data' in data;
    };

    const invalidResponse = '{"error": "Something went wrong"}';
    const defaultResponse: ApiResponse = { success: false, data: null };

    const result = safeJsonParseWithValidation(invalidResponse, isApiResponse, defaultResponse);

    expect(result).toBe(defaultResponse);
  });

  it('should handle nested JSON parsing safely', () => {
    const nestedJson = '{"settings": "{\\"theme\\": \\"dark\\"}"}';
    const outer = safeJsonParse<{ settings: string }>(nestedJson, {
      settings: '{}',
    });
    const inner = safeJsonParse(outer.settings, {});

    expect(inner).toEqual({ theme: 'dark' });
  });
});
