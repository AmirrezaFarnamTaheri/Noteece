/**
 * Safe JSON Parsing Utilities
 *
 * Provides type-safe JSON parsing with proper error handling
 * to prevent crashes from malformed data.
 */

/**
 * Safely parse JSON with error handling and optional default value
 * @param jsonString - The JSON string to parse
 * @param defaultValue - Default value if parsing fails
 * @param logError - Whether to log parsing errors (default: true)
 * @returns Parsed object or default value
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  defaultValue: T,
  logError = true,
): T {
  if (!jsonString) {
    return defaultValue;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    if (logError) {
      console.error(
        "JSON parse error:",
        error,
        "Input:",
        jsonString?.substring(0, 100),
      );
    }
    return defaultValue;
  }
}

/**
 * Safely parse JSON with validation
 * @param jsonString - The JSON string to parse
 * @param validator - Function to validate the parsed result
 * @param defaultValue - Default value if parsing or validation fails
 * @returns Parsed and validated object or default value
 */
export function safeJsonParseWithValidation<T>(
  jsonString: string | null | undefined,
  validator: (data: unknown) => data is T,
  defaultValue: T,
): T {
  const parsed = safeJsonParse<unknown>(jsonString, defaultValue, true);

  if (validator(parsed)) {
    return parsed;
  }

  console.error("JSON validation failed for:", jsonString?.substring(0, 100) ?? "undefined");
  return defaultValue;
}

/**
 * Safely stringify JSON with error handling
 * @param data - The data to stringify
 * @param defaultValue - Default string if stringify fails
 * @returns JSON string or default value
 */
export function safeJsonStringify(data: unknown, defaultValue = '{}'): string {
  try {
    const seen = new WeakSet<object>();
    const replacer = (_key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };
    const result = JSON.stringify(data, replacer);
    // JSON.stringify(undefined) yields undefined; return default instead
    return result ?? defaultValue;
  } catch (error) {
    console.error('JSON stringify error:', error);
    return defaultValue;
  }
}

/**
 * Type guard for checking if value is a valid JSON object
 */
export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is a valid JSON array
 */
export function isJsonArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
