/**
 * Lexical Editor Component with rich text editing and markdown support
 */

import { useEffect, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import type { EditorState } from 'lexical';
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Paper } from '@mantine/core';
import classes from './LexicalEditor.module.css';
import { logger } from '../utils/logger';

interface LexicalEditorProperties {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

// Theme configuration for Lexical editor
const theme = {
  paragraph: 'lexical-paragraph',
  quote: 'lexical-quote',
  heading: {
    h1: 'lexical-h1',
    h2: 'lexical-h2',
    h3: 'lexical-h3',
    h4: 'lexical-h4',
    h5: 'lexical-h5',
    h6: 'lexical-h6',
  },
  list: {
    ol: 'lexical-ol',
    ul: 'lexical-ul',
    listitem: 'lexical-list-item',
  },
  code: 'lexical-code',
  codeHighlight: {
    atrule: 'lexical-token-atrule',
    attr: 'lexical-token-attr',
    boolean: 'lexical-token-boolean',
    builtin: 'lexical-token-builtin',
    cdata: 'lexical-token-cdata',
    char: 'lexical-token-char',
    class: 'lexical-token-class',
    'class-name': 'lexical-token-class-name',
    comment: 'lexical-token-comment',
    constant: 'lexical-token-constant',
    deleted: 'lexical-token-deleted',
    doctype: 'lexical-token-doctype',
    entity: 'lexical-token-entity',
    function: 'lexical-token-function',
    important: 'lexical-token-important',
    inserted: 'lexical-token-inserted',
    keyword: 'lexical-token-keyword',
    namespace: 'lexical-token-namespace',
    number: 'lexical-token-number',
    operator: 'lexical-token-operator',
    prolog: 'lexical-token-prolog',
    property: 'lexical-token-property',
    punctuation: 'lexical-token-punctuation',
    regex: 'lexical-token-regex',
    selector: 'lexical-token-selector',
    string: 'lexical-token-string',
    symbol: 'lexical-token-symbol',
    tag: 'lexical-token-tag',
    url: 'lexical-token-url',
    variable: 'lexical-token-variable',
  },
  link: 'lexical-link',
  text: {
    bold: 'lexical-text-bold',
    italic: 'lexical-text-italic',
    underline: 'lexical-text-underline',
    strikethrough: 'lexical-text-strikethrough',
    code: 'lexical-text-code',
  },
};

// Plugin to sync markdown content
function MarkdownSyncPlugin({
  initialContent,
  suppressChangeRef,
}: {
  initialContent?: string;
  suppressChangeRef: React.MutableRefObject<boolean>;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Allow empty string to clear content as well
    if (initialContent !== undefined) {
      suppressChangeRef.current = true;
      editor.update(() => {
        $convertFromMarkdownString(initialContent || '', TRANSFORMERS);
      });
      // Re-enable after update microtask
      void Promise.resolve().then(() => {
        suppressChangeRef.current = false;
      });
    }
  }, [editor, initialContent, suppressChangeRef]);

  return null;
}

// Plugin to handle content changes and convert to markdown
function ChangePlugin({
  onChange,
  suppressChangeRef,
}: {
  onChange?: (content: string) => void;
  suppressChangeRef: React.MutableRefObject<boolean>;
}) {
  const handleChange = (editorState: EditorState) => {
    if (!onChange || suppressChangeRef.current) return;
    editorState.read(() => {
      const markdown = $convertToMarkdownString(TRANSFORMERS);
      onChange(markdown);
    });
  };

  return <OnChangePlugin onChange={handleChange} ignoreSelectionChange />;
}

export default function LexicalEditorComponent({
  initialContent = '',
  onChange,
  placeholder = 'Start typing...',
}: LexicalEditorProperties) {
  const suppressChangeReference = useRef(false);

  const initialConfig = {
    namespace: 'NoteeceEditor',
    theme,
    onError: (error: Error) => {
      logger.error('Lexical Editor Error:', error);
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, CodeHighlightNode, LinkNode],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <Paper withBorder className={classes.editorContainer}>
        <div className={classes.editorInner}>
          <RichTextPlugin
            contentEditable={<ContentEditable className={classes.contentEditable} />}
            placeholder={<div className={classes.placeholder}>{placeholder}</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <MarkdownSyncPlugin initialContent={initialContent} suppressChangeRef={suppressChangeReference} />
          <ChangePlugin onChange={onChange} suppressChangeRef={suppressChangeReference} />
        </div>
      </Paper>
    </LexicalComposer>
  );
}
