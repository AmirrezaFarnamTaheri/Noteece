/**
 * Automation DSL Parser Tests
 */

import { AutomationParser } from '../parser';
import { ParseError, LiteralNode, FunctionCallNode, TriggerEvent } from '../types';

describe('AutomationParser', () => {
  let parser: AutomationParser;

  beforeEach(() => {
    parser = new AutomationParser();
  });

  describe('Basic Parsing', () => {
    it('should parse empty program', () => {
      const result = parser.parse('');
      expect(result.type).toBe('Program');
      expect(result.triggers).toHaveLength(0);
      expect(result.actions).toHaveLength(0);
    });

    it('should parse simple trigger', () => {
      const script = `
        TRIGGER ON NoteCreated DO {
          Log(message: "Note created")
        }
      `;
      const result = parser.parse(script);
      expect(result.triggers).toHaveLength(1);
      expect(result.triggers[0].event.type).toBe('NoteCreated');
    });

    it('should parse trigger with condition', () => {
      const script = `
        TRIGGER ON NoteCreated
        WHEN tag == "urgent"
        DO {
          SendNotification(title: "Alert", body: "Urgent note")
        }
      `;
      const result = parser.parse(script);
      expect(result.triggers[0].conditions).toHaveLength(1);
    });

    it('should parse scheduled trigger', () => {
      const script = `
        TRIGGER ON Schedule("0 9 * * *") DO {
          Log(message: "Daily trigger")
        }
      `;
      const result = parser.parse(script);
      expect(result.triggers[0].event.type).toBe('Schedule');
      const scheduleEvent = result.triggers[0].event as TriggerEvent & {
        type: 'Schedule';
      };
      expect(scheduleEvent.cron).toBe('0 9 * * *');
    });
  });

  describe('Actions', () => {
    it('should parse CreateNote action', () => {
      const script = `
        TRIGGER ON Manual DO {
          CreateNote(title: "Test", content: "Content")
        }
      `;
      const result = parser.parse(script);
      const action = result.triggers[0].actions[0];
      expect(action.action).toBe('CreateNote');
      expect(action.parameters).toHaveProperty('title');
      expect(action.parameters).toHaveProperty('content');
    });

    it('should parse multiple actions', () => {
      const script = `
        TRIGGER ON NoteCreated DO {
          Log(message: "First action")
          SendNotification(title: "Test", body: "Message")
          CreateTask(title: "Follow-up")
        }
      `;
      const result = parser.parse(script);
      expect(result.triggers[0].actions).toHaveLength(3);
    });
  });

  describe('Expressions', () => {
    it('should parse literal values', () => {
      const script = `
        TRIGGER ON Manual DO {
          Log(message: "test")
        }
      `;
      const result = parser.parse(script);
      const expr = result.triggers[0].actions[0].parameters.message;
      expect(expr.type).toBe('Literal');
      expect((expr as LiteralNode).value).toBe('test');
    });

    it('should parse arithmetic expressions', () => {
      const script = `
        TRIGGER ON Manual
        WHEN count > 5
        DO {
          Log(message: "count exceeded")
        }
      `;
      const result = parser.parse(script);
      const condition = result.triggers[0].conditions[0].expression;
      expect(condition.type).toBe('BinaryExpression');
    });

    it('should parse function calls', () => {
      const script = `
        TRIGGER ON Manual DO {
          Log(message: concat("Hello", "World"))
        }
      `;
      const result = parser.parse(script);
      const expr = result.triggers[0].actions[0].parameters.message;
      expect(expr.type).toBe('FunctionCall');
      expect((expr as FunctionCallNode).name).toBe('concat');
    });
  });

  describe('Error Handling', () => {
    it('should throw ParseError on invalid syntax', () => {
      const script = 'TRIGGER ON';
      expect(() => parser.parse(script)).toThrow(ParseError);
    });

    it('should throw ParseError on missing DO', () => {
      const script = 'TRIGGER ON NoteCreated {';
      expect(() => parser.parse(script)).toThrow(ParseError);
    });

    it('should throw ParseError on unclosed brace', () => {
      const script = 'TRIGGER ON Manual DO { Log(message: "test"';
      expect(() => parser.parse(script)).toThrow(ParseError);
    });
  });

  describe('Complex Scripts', () => {
    it('should parse multiple triggers', () => {
      const script = `
        TRIGGER ON NoteCreated DO {
          Log(message: "Note created")
        }

        TRIGGER ON TaskCompleted DO {
          Log(message: "Task completed")
        }
      `;
      const result = parser.parse(script);
      expect(result.triggers).toHaveLength(2);
    });

    it('should parse complex conditions', () => {
      const script = `
        TRIGGER ON NoteUpdated
        WHEN priority > 5
        DO {
          SendNotification(title: "High Priority", body: "Update detected")
        }
      `;
      const result = parser.parse(script);
      expect(result.triggers[0].conditions[0].expression.type).toBe('BinaryExpression');
    });
  });
});
