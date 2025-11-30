import React from 'react';

export interface EditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function Editor({ value, onChange }: EditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        height: '400px',
        fontSize: '16px',
        padding: '10px',
      }}
    />
  );
}
