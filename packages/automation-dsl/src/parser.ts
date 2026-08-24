/**
 * Automation DSL Parser
 *
 * Parses automation scripts into an Abstract Syntax Tree (AST).
 *
 * Grammar (implemented):
 *   program     := (trigger | standalone-action)*
 *   trigger     := 'TRIGGER' 'ON' event ['WHEN' expression] 'DO' block
 *   event       := NoteCreated | NoteUpdated | NoteDeleted | TaskCompleted |
 *                  TagAdded | Schedule '(' STRING ')' | Manual
 *   block       := '{' action* '}'
 *   action      := IDENTIFIER '(' [param (',' param)*] ')' ';'?
 *   param       := IDENTIFIER ':' expression
 *   expression  := or
 *   or          := and (('||' | OR) and)*
 *   and         := equality (('&&' | AND) equality)*
 *   equality    := comparison (('==' | '!=') comparison)*
 *   comparison  := term (('<' | '>' | '<=' | '>=') term)*
 *   term        := factor (('+' | '-') factor)*
 *   factor      := primary (('*' | '/' | '%') primary)*
 *   primary     := NUMBER | STRING | array | 'true' | 'false' | 'null'
 *                | function-call | IDENTIFIER | '(' expression ')'
 *   array       := '[' [expression (',' expression)*] ']'
 *
 * Unknown characters raise a ParseError instead of being silently dropped.
 */

import { ProgramNode, TriggerNode, ActionNode, ExpressionNode, ParseError } from './types';

export class AutomationParser {
  private tokens: Token[] = [];
  private current = 0;

  parse(input: string): ProgramNode {
    this.tokens = this.tokenize(input);
    this.current = 0;

    const triggers: TriggerNode[] = [];
    const actions: ActionNode[] = [];

    while (!this.isAtEnd()) {
      if (this.match('TRIGGER')) {
        triggers.push(this.parseTrigger());
      } else if (this.match('ACTION')) {
        actions.push(this.parseAction());
      } else {
        // Skip stray top-level tokens (e.g. whitespace-separated identifiers)
        // but never silently swallow structural keywords.
        this.advance();
      }
    }

    return {
      type: 'Program',
      triggers,
      actions,
    };
  }

  private tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    // Order matters: multi-char operators before single-char delimiters.
    const regex =
      /\s*(=>|==|!=|<=|>=|&&|\|\||[+\-*/%<>(){}[\],;:]|"[^"\n]*"|'[^'\n]*'|-?\d+(?:\.\d+)?|[A-Za-z_]\w*)\s*/gy;

    let cursor = 0;
    while (cursor < input.length) {
      regex.lastIndex = cursor;
      const match = regex.exec(input);

      if (!match || match.index !== cursor) {
        // No valid token at this position: report it instead of dropping it.
        const rest = input.slice(cursor);
        const badChar = rest.trim()[0] ?? '';
        throw new ParseError(
          `Unexpected character '${badChar}' at offset ${cursor} ` +
            `(near "${rest.slice(0, 20).replace(/\s+/g, ' ')}")`,
        );
      }

      const value = match[1];
      if (value !== undefined && !/^\s*$/.test(value)) {
        tokens.push({
          type: this.getTokenType(value),
          value,
          line: this.lineAt(input, cursor),
          column: this.columnAt(input, cursor),
        });
      }

      cursor = regex.lastIndex;
    }

    return tokens;
  }

  private lineAt(input: string, offset: number): number {
    let line = 1;
    for (let i = 0; i < offset; i++) {
      if (input[i] === '\n') line++;
    }
    return line;
  }

  private columnAt(input: string, offset: number): number {
    const lastNewline = input.lastIndexOf('\n', offset - 1);
    return offset - lastNewline;
  }

  private getTokenType(value: string): TokenType {
    const keywords = ['TRIGGER', 'ON', 'WHEN', 'DO', 'IF', 'THEN', 'ELSE', 'AND', 'OR', 'NOT'];

    if (keywords.includes(value.toUpperCase())) {
      return value.toUpperCase() as TokenType;
    }

    if (/^-?\d+(\.\d+)?$/.test(value)) return 'NUMBER';
    if (/^["']/.test(value)) return 'STRING';
    if (/^[a-zA-Z_]\w*$/.test(value)) return 'IDENTIFIER';

    return value as TokenType;
  }

  private parseTrigger(): TriggerNode {
    this.consume('ON', 'Expected ON after TRIGGER');

    const event = this.parseTriggerEvent();
    const conditions = [];
    const actions = [];

    if (this.match('WHEN')) {
      conditions.push({
        type: 'Condition' as const,
        expression: this.parseExpression(),
      });
    }

    this.consume('DO', 'Expected DO');

    this.consume('{', 'Expected {');
    while (!this.check('}') && !this.isAtEnd()) {
      actions.push(this.parseAction());
    }
    this.consume('}', 'Expected }');

    return {
      type: 'Trigger',
      event,
      conditions,
      actions,
    };
  }

  private parseTriggerEvent(): TriggerNode['event'] {
    const eventType = this.advance().value;

    switch (eventType) {
      case 'NoteCreated':
        return { type: 'NoteCreated' };
      case 'NoteUpdated':
        return { type: 'NoteUpdated' };
      case 'NoteDeleted':
        return { type: 'NoteDeleted' };
      case 'TaskCompleted':
        return { type: 'TaskCompleted' };
      case 'TagAdded':
        return { type: 'TagAdded' };
      case 'Schedule': {
        this.consume('(', 'Expected (');
        if (!this.check('STRING')) {
          throw new ParseError('Expected cron string literal for Schedule(...)');
        }
        const cronStr = this.advance().value.slice(1, -1);
        if (!cronStr || cronStr.trim().length === 0) {
          throw new ParseError('Cron string cannot be empty');
        }
        this.consume(')', 'Expected )');
        return { type: 'Schedule', cron: cronStr };
      }
      case 'Manual':
        return { type: 'Manual' };
      default:
        throw new ParseError(`Unknown trigger event: ${eventType}`);
    }
  }

  private parseAction(): ActionNode {
    if (!this.check('IDENTIFIER')) {
      throw new ParseError(`Expected action name, got: ${this.describeToken(this.peek())}`);
    }
    const nameToken = this.advance();
    const actionName = nameToken.value;

    const parameters: Record<string, ExpressionNode> = {};

    if (this.match('(')) {
      while (!this.check(')') && !this.isAtEnd()) {
        // Ensure parameter name is a valid identifier
        if (!this.check('IDENTIFIER')) {
          throw new ParseError(`Expected parameter name (identifier), got: ${this.describeToken(this.peek())}`);
        }
        const paramName = this.advance().value;
        this.consume(':', 'Expected :');
        parameters[paramName] = this.parseExpression();

        if (!this.check(')')) {
          this.consume(',', 'Expected ,');
        }
      }
      this.consume(')', 'Expected )');
    }

    this.match(';');

    return {
      type: 'Action',
      action: actionName as ActionNode['action'],
      parameters,
    };
  }

  private parseExpression(): ExpressionNode {
    return this.parseOr();
  }

  /** Logical OR — lowest precedence. Accepts both symbolic and keyword forms. */
  private parseOr(): ExpressionNode {
    let expr = this.parseAnd();

    while (this.match('||') || this.matchWord('OR')) {
      const right = this.parseAnd();
      expr = {
        type: 'BinaryExpression',
        operator: '||',
        left: expr,
        right,
      };
    }

    return expr;
  }

  /** Logical AND — binds tighter than OR. Accepts both forms. */
  private parseAnd(): ExpressionNode {
    let expr = this.parseEquality();

    while (this.match('&&') || this.matchWord('AND')) {
      const right = this.parseEquality();
      expr = {
        type: 'BinaryExpression',
        operator: '&&',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseEquality(): ExpressionNode {
    let expr = this.parseComparison();

    while (this.match('==', '!=')) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpression',
        operator: operator as '==' | '!=',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseComparison(): ExpressionNode {
    let expr = this.parseTerm();

    while (this.match('<', '>', '<=', '>=')) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      expr = {
        type: 'BinaryExpression',
        operator: operator as '<' | '>' | '<=' | '>=',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseTerm(): ExpressionNode {
    let expr = this.parseFactor();

    while (this.match('+', '-')) {
      const operator = this.previous().value;
      const right = this.parseFactor();
      expr = {
        type: 'BinaryExpression',
        operator: operator as '+' | '-',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parseFactor(): ExpressionNode {
    let expr = this.parsePrimary();

    while (this.match('*', '/', '%')) {
      const operator = this.previous().value;
      const right = this.parsePrimary();
      expr = {
        type: 'BinaryExpression',
        operator: operator as '*' | '/' | '%',
        left: expr,
        right,
      };
    }

    return expr;
  }

  private parsePrimary(): ExpressionNode {
    if (this.match('NUMBER')) {
      return {
        type: 'Literal',
        value: Number.parseFloat(this.previous().value),
      };
    }

    if (this.match('STRING')) {
      return {
        type: 'Literal',
        value: this.previous().value.slice(1, -1),
      };
    }

    // Array literal: ["tag1", "tag2"] — documented in the README.
    if (this.match('[')) {
      const elements: ExpressionNode[] = [];
      if (!this.check(']')) {
        do {
          elements.push(this.parseExpression());
        } while (this.match(',') && !this.check(']'));
      }
      this.consume(']', 'Expected ] to close array literal');
      return {
        type: 'ArrayLiteral',
        elements,
      };
    }

    if (this.match('IDENTIFIER')) {
      const name = this.previous().value;
      // Recognize boolean and null literals
      if (name === 'true' || name === 'false') {
        return { type: 'Literal', value: name === 'true' };
      }
      if (name === 'null') {
        return { type: 'Literal', value: null };
      }

      if (this.match('(')) {
        const args: ExpressionNode[] = [];
        while (!this.check(')') && !this.isAtEnd()) {
          args.push(this.parseExpression());
          if (!this.check(')')) {
            this.consume(',', 'Expected ,');
          }
        }
        this.consume(')', 'Expected )');

        return {
          type: 'FunctionCall',
          name,
          arguments: args,
        };
      }

      return {
        type: 'Identifier',
        name,
      };
    }

    if (this.match('(')) {
      const expr = this.parseExpression();
      this.consume(')', 'Expected )');
      return expr;
    }

    throw new ParseError(`Unexpected token: ${this.describeToken(this.peek())}`);
  }

  /** Match a keyword by its canonical uppercase token type. */
  private matchWord(word: string): boolean {
    if (!this.isAtEnd() && this.peek().type === word.toUpperCase()) {
      this.current++;
      return true;
    }
    return false;
  }

  private describeToken(token: Token): string {
    if (token.type === 'EOF') return 'end of script';
    return `'${token.value}' (line ${token.line})`;
  }

  // Helper methods
  private match(...types: string[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type || this.peek().value === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }

  private peek(): Token {
    return (
      this.tokens[this.current] || {
        type: 'EOF',
        value: '',
        line: 0,
        column: 0,
      }
    );
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: string, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message);
  }
}

type TokenType =
  | 'TRIGGER'
  | 'ON'
  | 'WHEN'
  | 'DO'
  | 'IF'
  | 'THEN'
  | 'ELSE'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'EOF'
  | string;

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}
