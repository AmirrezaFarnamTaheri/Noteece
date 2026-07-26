#!/usr/bin/env node
/**
 * IPC contract check.
 *
 * The desktop frontend reaches the Rust backend through `invoke('<command>')`.
 * Nothing in the type system ties those string literals to the commands actually
 * registered in `generate_handler!`, and the Jest suite mocks `invoke` with a bare
 * `jest.fn()` — which resolves ANY name. So a frontend call to a command that does
 * not exist passes every test and fails only at runtime, in front of a user.
 *
 * That is not hypothetical: it is how the vault create/unlock screen shipped
 * broken (`create_vault` vs the registered `create_vault_cmd`), and several tests
 * assert dead command names and pass.
 *
 * This script diffs the two sets and fails on any invoked-but-unregistered name.
 *
 * Limitation: only string-literal command names are detected. A dynamically
 * constructed name (template literal, variable) is invisible here, so the count
 * this reports is a lower bound. Prefer literals at call sites.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const REPO_ROOT = new URL('..', import.meta.url).pathname;
const FRONTEND_DIR = join(REPO_ROOT, 'apps/desktop/src');
const MAIN_RS = join(REPO_ROOT, 'apps/desktop/src-tauri/src/main.rs');

/** Recursively collect .ts/.tsx files, skipping tests and node_modules. */
function sourceFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'coverage') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, acc);
      continue;
    }
    if (!['.ts', '.tsx'].includes(extname(entry))) continue;
    // Tests are excluded: they legitimately reference command names in
    // assertions, and including them would mask which call sites are real.
    if (full.includes('__tests__') || /\.(test|spec)\.tsx?$/.test(entry)) continue;
    acc.push(full);
  }
  return acc;
}

/** Command names registered in the tauri::generate_handler! block. */
function registeredCommands() {
  const src = readFileSync(MAIN_RS, 'utf8');
  const start = src.indexOf('generate_handler!');
  if (start === -1) {
    throw new Error(`Could not find generate_handler! in ${MAIN_RS}`);
  }
  // Walk from the macro's opening bracket to its matching close.
  const open = src.indexOf('[', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = src.slice(open + 1, end);
  return new Set(
    block
      .split(',')
      .map((s) => s.replace(/\/\/.*$/gm, '').trim())
      .filter(Boolean)
      // Entries may be path-qualified, e.g. `commands::notes::create_note_cmd`.
      .map((s) => s.split('::').pop())
      .filter((s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s)),
  );
}

/** Command names invoked from frontend source, with their call sites. */
function invokedCommands() {
  const found = new Map();
  for (const file of sourceFiles(FRONTEND_DIR)) {
    const text = readFileSync(file, 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      // invoke('name'  |  invoke<T>('name'  |  invoke("name"
      const re = /\binvoke\s*(?:<[^>]*>)?\s*\(\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = re.exec(line)) !== null) {
        const name = m[1];
        if (!found.has(name)) found.set(name, []);
        found.get(name).push(`${file.replace(REPO_ROOT, '')}:${idx + 1}`);
      }
    });
  }
  return found;
}

const registered = registeredCommands();
const invoked = invokedCommands();

const missing = [...invoked.entries()]
  .filter(([name]) => !registered.has(name))
  .sort(([a], [b]) => a.localeCompare(b));

console.log(`Registered Tauri commands : ${registered.size}`);
console.log(`Distinct invoked commands : ${invoked.size}`);
console.log(`Invoked but unregistered  : ${missing.length}`);

if (missing.length > 0) {
  console.error('\nThese commands are invoked by the frontend but are NOT registered');
  console.error('in generate_handler!. Each one throws at runtime:\n');
  for (const [name, sites] of missing) {
    console.error(`  ${name}`);
    for (const site of sites) console.error(`      ${site}`);
  }
  console.error(
    '\nFix by registering the command in main.rs (and declaring its module in\n' +
      'commands/mod.rs), or by correcting the name at the call site.',
  );
  process.exit(1);
}

console.log('\nOK: every invoked command is registered.');
