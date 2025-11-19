/**
 * Automation DSL Type Definitions
 *
 * Defines the abstract syntax tree (AST) and runtime types
 * for the Noteece automation language.
 */

export type AutomationValue =
  | string
  | number
  | boolean
  | null
  | AutomationValue[]
  | { [key: string]: AutomationValue };

export interface AutomationContext {
  variables: Map<string, AutomationValue>;
  functions: Map<string, AutomationFunction>;
  noteece: NoteeceAPI;
}

export interface NoteeceAPI {
  createNote: (
    title: string,
    content: string,
    tags?: string[],
  ) => Promise<string>;
  updateNote: (id: string, updates: Record<string, unknown>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  searchNotes: (query: string) => Promise<Note[]>;
  createTask: (title: string, dueDate?: Date) => Promise<string>;
  updateTask: (id: string, updates: Record<string, unknown>) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  addTag: (noteId: string, tag: string) => Promise<void>;
  removeTag: (noteId: string, tag: string) => Promise<void>;
  getTags: () => Promise<string[]>;
  sendNotification: (title: string, body: string) => Promise<void>;
  log: (message: string) => void;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export type AutomationFunction = (
  ...args: AutomationValue[]
) => AutomationValue | Promise<AutomationValue>;

// AST Node Types
export type ASTNode =
  | ProgramNode
  | TriggerNode
  | ActionNode
  | ConditionNode
  | ExpressionNode
  | VariableDeclarationNode
  | FunctionCallNode
  | LiteralNode
  | IdentifierNode
  | BinaryExpressionNode;

export interface ProgramNode {
  type: "Program";
  triggers: TriggerNode[];
  actions: ActionNode[];
}

export interface TriggerNode {
  type: "Trigger";
  event: TriggerEvent;
  conditions: ConditionNode[];
  actions: ActionNode[];
}

export type TriggerEvent =
  | { type: "NoteCreated"; filters?: Record<string, unknown> }
  | { type: "NoteUpdated"; filters?: Record<string, unknown> }
  | { type: "NoteDeleted"; filters?: Record<string, unknown> }
  | { type: "TaskCompleted"; filters?: Record<string, unknown> }
  | { type: "TagAdded"; tag?: string }
  | { type: "Schedule"; cron: string }
  | { type: "Manual" };

export interface ConditionNode {
  type: "Condition";
  expression: ExpressionNode;
}

export interface ActionNode {
  type: "Action";
  action: ActionType;
  parameters: Record<string, ExpressionNode>;
}

export type ActionType =
  | "CreateNote"
  | "UpdateNote"
  | "DeleteNote"
  | "CreateTask"
  | "CompleteTask"
  | "AddTag"
  | "RemoveTag"
  | "SendNotification"
  | "Wait"
  | "Log";

export interface VariableDeclarationNode {
  type: "VariableDeclaration";
  name: string;
  value: ExpressionNode;
}

export interface FunctionCallNode {
  type: "FunctionCall";
  name: string;
  arguments: ExpressionNode[];
}

export interface LiteralNode {
  type: "Literal";
  value: string | number | boolean | null;
}

export interface IdentifierNode {
  type: "Identifier";
  name: string;
}

export interface BinaryExpressionNode {
  type: "BinaryExpression";
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "=="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">="
  | "&&"
  | "||";

export type ExpressionNode =
  | LiteralNode
  | IdentifierNode
  | BinaryExpressionNode
  | FunctionCallNode;

// Runtime Types
export interface AutomationRuntime {
  context: AutomationContext;
  execute: (program: ProgramNode) => Promise<void>;
  evaluateExpression: (expr: ExpressionNode) => Promise<AutomationValue>;
  registerTrigger: (trigger: TriggerNode) => void;
  unregisterTrigger: (triggerId: string) => void;
}

// Error Types
export class AutomationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AutomationError";
  }
}

export class ParseError extends AutomationError {
  constructor(message: string, details?: unknown) {
    super(message, "PARSE_ERROR", details);
    this.name = "ParseError";
  }
}

export class RuntimeError extends AutomationError {
  constructor(message: string, details?: unknown) {
    super(message, "RUNTIME_ERROR", details);
    this.name = "RuntimeError";
  }
}
