/**
 * Automation DSL Runtime
 *
 * Executes parsed automation scripts
 */

import {
  AutomationContext,
  AutomationRuntime,
  AutomationValue,
  ProgramNode,
  TriggerNode,
  ActionNode,
  ExpressionNode,
  NoteeceAPI,
  RuntimeError,
} from './types';

/**
 * Runtime executor for automation scripts
 */
export class AutomationRuntimeImpl implements AutomationRuntime {
  context: AutomationContext;
  private activeTriggers: Map<string, TriggerNode> = new Map();

  constructor(noteeceAPI: NoteeceAPI) {
    this.context = {
      variables: new Map(),
      functions: new Map([
        ['concat', (...args) => args.map(String).join('')],
        ['upper', (str) => String(str).toUpperCase()],
        ['lower', (str) => String(str).toLowerCase()],
        ['now', () => new Date().toISOString()],
        ['date', (str) => new Date(String(str)).toISOString()],
      ]),
      noteece: noteeceAPI,
    };
  }

  async execute(program: ProgramNode): Promise<void> {
    // Register all triggers
    for (const trigger of program.triggers) {
      this.registerTrigger(trigger);
    }

    // Execute immediate actions
    for (const action of program.actions) {
      await this.executeAction(action);
    }
  }

  registerTrigger(trigger: TriggerNode): void {
    const triggerId = `trigger_${this.activeTriggers.size}`;
    this.activeTriggers.set(triggerId, trigger);
  }

  unregisterTrigger(triggerId: string): void {
    this.activeTriggers.delete(triggerId);
  }

  async evaluateExpression(expr: ExpressionNode): Promise<AutomationValue> {
    switch (expr.type) {
      case 'Literal':
        return expr.value;

      case 'Identifier': {
        const value = this.context.variables.get(expr.name);
        if (value === undefined) {
          throw new RuntimeError(`Undefined variable: ${expr.name}`);
        }
        return value;
      }

      case 'BinaryExpression': {
        const left = await this.evaluateExpression(expr.left);
        const right = await this.evaluateExpression(expr.right);
        return this.evaluateBinaryExpression(expr.operator, left, right);
      }

      case 'FunctionCall': {
        const func = this.context.functions.get(expr.name);
        if (!func) {
          throw new RuntimeError(`Undefined function: ${expr.name}`);
        }

        const args = await Promise.all(
          expr.arguments.map((arg) => this.evaluateExpression(arg))
        );

        return await func(...args);
      }

      default:
        throw new RuntimeError(`Unknown expression type: ${(expr as { type: string }).type}`);
    }
  }

  private evaluateBinaryExpression(
    operator: string,
    left: AutomationValue,
    right: AutomationValue
  ): AutomationValue {
    const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

    switch (operator) {
      case '+':
      case '-':
      case '*':
      case '/':
      case '%': {
        if (!isNumber(left) || !isNumber(right)) {
          throw new RuntimeError(`Operator '${operator}' requires numeric operands`);
        }
        switch (operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/': return left / right;
          case '%': return left % right;
        }
        break;
      }
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '<':
      case '>':
      case '<=':
      case '>=': {
        if (!isNumber(left) || !isNumber(right)) {
          throw new RuntimeError(`Operator '${operator}' requires numeric operands`);
        }
        switch (operator) {
          case '<': return left < right;
          case '>': return left > right;
          case '<=': return left <= right;
          case '>=': return left >= right;
        }
        break;
      }
      case '&&':
        return Boolean(left) && Boolean(right);
      case '||':
        return Boolean(left) || Boolean(right);
      default:
        throw new RuntimeError(`Unknown operator: ${operator}`);
    }
  }

  private async executeAction(action: ActionNode): Promise<void> {
    const params: Record<string, AutomationValue> = {};

    for (const [key, expr] of Object.entries(action.parameters)) {
      params[key] = await this.evaluateExpression(expr);
    }

    switch (action.action) {
      case 'CreateNote':
        await this.context.noteece.createNote(
          String(params.title),
          String(params.content),
          params.tags as string[] | undefined
        );
        break;

      case 'UpdateNote':
        await this.context.noteece.updateNote(
          String(params.id),
          params.updates as Record<string, unknown>
        );
        break;

      case 'DeleteNote':
        await this.context.noteece.deleteNote(String(params.id));
        break;

      case 'CreateTask':
        await this.context.noteece.createTask(
          String(params.title),
          params.dueDate ? new Date(String(params.dueDate)) : undefined
        );
        break;

      case 'CompleteTask':
        await this.context.noteece.completeTask(String(params.id));
        break;

      case 'AddTag':
        await this.context.noteece.addTag(String(params.noteId), String(params.tag));
        break;

      case 'RemoveTag':
        await this.context.noteece.removeTag(String(params.noteId), String(params.tag));
        break;

      case 'SendNotification':
        await this.context.noteece.sendNotification(
          String(params.title),
          String(params.body)
        );
        break;

      case 'Wait':
        await new Promise((resolve) => setTimeout(resolve, Number(params.ms)));
        break;

      case 'Log':
        this.context.noteece.log(String(params.message));
        break;

      default:
        throw new RuntimeError(`Unknown action: ${action.action}`);
    }
  }

  /**
   * Fire a trigger event manually (for testing or manual invocation)
   */
  async fireTrigger(eventType: string, _data?: unknown): Promise<void> {
    for (const [, trigger] of this.activeTriggers) {
      if (trigger.event.type === eventType) {
        // Check conditions
        let conditionsMet = true;
        for (const condition of trigger.conditions) {
          const result = await this.evaluateExpression(condition.expression);
          if (!result) {
            conditionsMet = false;
            break;
          }
        }

        if (conditionsMet) {
          // Execute actions
          for (const action of trigger.actions) {
            await this.executeAction(action);
          }
        }
      }
    }
  }
}

/**
 * Create a default NoteeceAPI implementation for testing
 */
export function createMockNoteeceAPI(): NoteeceAPI {
  return {
    async createNote(title, content, tags) {
      console.log(`[Mock] Create note: ${title}`, { content, tags });
      return `note_${Date.now()}`;
    },
    async updateNote(id, updates) {
      console.log(`[Mock] Update note: ${id}`, updates);
    },
    async deleteNote(id) {
      console.log(`[Mock] Delete note: ${id}`);
    },
    async searchNotes(query) {
      console.log(`[Mock] Search notes: ${query}`);
      return [];
    },
    async createTask(title, dueDate) {
      console.log(`[Mock] Create task: ${title}`, { dueDate });
      return `task_${Date.now()}`;
    },
    async updateTask(id, updates) {
      console.log(`[Mock] Update task: ${id}`, updates);
    },
    async completeTask(id) {
      console.log(`[Mock] Complete task: ${id}`);
    },
    async addTag(noteId, tag) {
      console.log(`[Mock] Add tag: ${tag} to ${noteId}`);
    },
    async removeTag(noteId, tag) {
      console.log(`[Mock] Remove tag: ${tag} from ${noteId}`);
    },
    async getTags() {
      console.log('[Mock] Get tags');
      return [];
    },
    async sendNotification(title, body) {
      console.log(`[Mock] Notification: ${title} - ${body}`);
    },
    log(message) {
      console.log(`[Automation Log] ${message}`);
    },
  };
}
