/**
 * Automation DSL Main Entry Point
 */

export { AutomationParser } from './parser';
export { AutomationRuntimeImpl, createMockNoteeceAPI } from './runtime';
export * from './types';

/**
 * Convenience function to parse and execute automation scripts
 */
import { AutomationParser } from './parser';
import { AutomationRuntimeImpl } from './runtime';
import type { NoteeceAPI, ProgramNode } from './types';

export async function runAutomation(
  script: string,
  noteeceAPI: NoteeceAPI
): Promise<void> {
  const parser = new AutomationParser();
  const program = parser.parse(script);
  const runtime = new AutomationRuntimeImpl(noteeceAPI);
  await runtime.execute(program);
}

export function parseAutomation(script: string): ProgramNode {
  const parser = new AutomationParser();
  return parser.parse(script);
}
