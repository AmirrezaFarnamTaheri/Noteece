/**
 * Automation DSL Runtime Tests
 */

import { AutomationRuntimeImpl, createMockNoteeceAPI } from '../runtime';
import { AutomationParser } from '../parser';
import { NoteeceAPI, RuntimeError } from '../types';

describe('AutomationRuntimeImpl', () => {
  let runtime: AutomationRuntimeImpl;
  let mockAPI: NoteeceAPI;
  let parser: AutomationParser;

  beforeEach(() => {
    mockAPI = createMockNoteeceAPI();
    runtime = new AutomationRuntimeImpl(mockAPI);
    parser = new AutomationParser();
  });

  describe('Expression Evaluation', () => {
    it('should evaluate literal expressions', async () => {
      const expr = { type: 'Literal' as const, value: 42 };
      const result = await runtime.evaluateExpression(expr);
      expect(result).toBe(42);
    });

    it('should evaluate arithmetic expressions', async () => {
      const expr = {
        type: 'BinaryExpression' as const,
        operator: '+' as const,
        left: { type: 'Literal' as const, value: 10 },
        right: { type: 'Literal' as const, value: 5 },
      };
      const result = await runtime.evaluateExpression(expr);
      expect(result).toBe(15);
    });

    it('should evaluate comparison expressions', async () => {
      const expr = {
        type: 'BinaryExpression' as const,
        operator: '>' as const,
        left: { type: 'Literal' as const, value: 10 },
        right: { type: 'Literal' as const, value: 5 },
      };
      const result = await runtime.evaluateExpression(expr);
      expect(result).toBe(true);
    });

    it('should evaluate function calls', async () => {
      const expr = {
        type: 'FunctionCall' as const,
        name: 'concat',
        arguments: [
          { type: 'Literal' as const, value: 'Hello' },
          { type: 'Literal' as const, value: ' World' },
        ],
      };
      const result = await runtime.evaluateExpression(expr);
      expect(result).toBe('Hello World');
    });

    it('should throw RuntimeError on undefined variable', async () => {
      const expr = { type: 'Identifier' as const, name: 'undefined_var' };
      await expect(runtime.evaluateExpression(expr)).rejects.toThrow(RuntimeError);
    });

    it('should throw RuntimeError on undefined function', async () => {
      const expr = {
        type: 'FunctionCall' as const,
        name: 'undefined_func',
        arguments: [],
      };
      await expect(runtime.evaluateExpression(expr)).rejects.toThrow(RuntimeError);
    });
  });

  describe('Action Execution', () => {
    it('should execute CreateNote action', async () => {
      const spy = jest.spyOn(mockAPI, 'createNote');
      const script = `
        TRIGGER ON Manual DO {
          CreateNote(title: "Test", content: "Content")
        }
      `;
      const program = parser.parse(script);
      await runtime.execute(program);

      // Fire the trigger manually
      await runtime.fireTrigger('Manual');

      expect(spy).toHaveBeenCalledWith('Test', 'Content', undefined);
    });

    it('should execute SendNotification action', async () => {
      const spy = jest.spyOn(mockAPI, 'sendNotification');
      const script = `
        TRIGGER ON Manual DO {
          SendNotification(title: "Alert", body: "Message")
        }
      `;
      const program = parser.parse(script);
      await runtime.execute(program);
      await runtime.fireTrigger('Manual');

      expect(spy).toHaveBeenCalledWith('Alert', 'Message');
    });

    it('should execute Log action', async () => {
      const spy = jest.spyOn(mockAPI, 'log');
      const script = `
        TRIGGER ON Manual DO {
          Log(message: "Debug info")
        }
      `;
      const program = parser.parse(script);
      await runtime.execute(program);
      await runtime.fireTrigger('Manual');

      expect(spy).toHaveBeenCalledWith('Debug info');
    });

    it('should execute multiple actions in sequence', async () => {
      const createSpy = jest.spyOn(mockAPI, 'createNote');
      const notifySpy = jest.spyOn(mockAPI, 'sendNotification');

      const script = `
        TRIGGER ON Manual DO {
          CreateNote(title: "Test", content: "Content")
          SendNotification(title: "Done", body: "Created")
        }
      `;
      const program = parser.parse(script);
      await runtime.execute(program);
      await runtime.fireTrigger('Manual');

      expect(createSpy).toHaveBeenCalled();
      expect(notifySpy).toHaveBeenCalled();
    });
  });

  describe('Trigger Management', () => {
    it('should register triggers', async () => {
      const script = `
        TRIGGER ON NoteCreated DO {
          Log(message: "Note created")
        }
      `;
      const program = parser.parse(script);
      await runtime.execute(program);

      expect(runtime.context).toBeDefined();
    });

    it('should fire triggers on matching events', async () => {
      const spy = jest.spyOn(mockAPI, 'log');
      const script = `
        TRIGGER ON NoteCreated DO {
          Log(message: "Triggered")
        }
      `;
      const program = parser.parse(script);
      await runtime.execute(program);
      await runtime.fireTrigger('NoteCreated');

      expect(spy).toHaveBeenCalledWith('Triggered');
    });

    it('should respect trigger conditions', async () => {
      const spy = jest.spyOn(mockAPI, 'log');

      // Set a variable that the condition will check
      runtime.context.variables.set('enabled', true);

      const script = `
        TRIGGER ON Manual
        WHEN enabled == true
        DO {
          Log(message: "Condition met")
        }
      `;
      const program = parser.parse(script);
      await runtime.execute(program);
      await runtime.fireTrigger('Manual');

      expect(spy).toHaveBeenCalledWith('Condition met');
    });
  });

  describe('Built-in Functions', () => {
    it('should have concat function', async () => {
      const expr = {
        type: 'FunctionCall' as const,
        name: 'concat',
        arguments: [
          { type: 'Literal' as const, value: 'a' },
          { type: 'Literal' as const, value: 'b' },
          { type: 'Literal' as const, value: 'c' },
        ],
      };
      const result = await runtime.evaluateExpression(expr);
      expect(result).toBe('abc');
    });

    it('should have upper function', async () => {
      const expr = {
        type: 'FunctionCall' as const,
        name: 'upper',
        arguments: [{ type: 'Literal' as const, value: 'hello' }],
      };
      const result = await runtime.evaluateExpression(expr);
      expect(result).toBe('HELLO');
    });

    it('should have lower function', async () => {
      const expr = {
        type: 'FunctionCall' as const,
        name: 'lower',
        arguments: [{ type: 'Literal' as const, value: 'HELLO' }],
      };
      const result = await runtime.evaluateExpression(expr);
      expect(result).toBe('hello');
    });

    it('should have now function', async () => {
      const expr = {
        type: 'FunctionCall' as const,
        name: 'now',
        arguments: [],
      };
      const result = await runtime.evaluateExpression(expr);
      expect(typeof result).toBe('string');
      expect(new Date(result as string).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Integration Tests', () => {
    it('should execute complete automation workflow', async () => {
      const createSpy = jest.spyOn(mockAPI, 'createNote');
      const notifySpy = jest.spyOn(mockAPI, 'sendNotification');

      const script = `
        TRIGGER ON NoteCreated DO {
          CreateNote(title: "Summary", content: "Auto-generated")
          SendNotification(title: "Success", body: "Note created")
        }
      `;

      const program = parser.parse(script);
      await runtime.execute(program);
      await runtime.fireTrigger('NoteCreated');

      expect(createSpy).toHaveBeenCalled();
      expect(notifySpy).toHaveBeenCalled();
    });
  });
});
