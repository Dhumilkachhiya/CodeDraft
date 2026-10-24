import React from "react";
import Editor from "@monaco-editor/react";

function CodeEditor({ value, onChange, language = "javascript", height = "400px" }) {
  const handleEditorChange = (val) => {
    if (onChange) {
      onChange(val);
    }
  };

  const editorOptions = {
    lineNumbers: "on",
    minimap: { enabled: false },
    smoothScrolling: true,
    bracketPairColorization: { enabled: true },
    fontSize: 14,
    fontFamily: "JetBrains Mono, ui-monospace, monospace",
    cursorBlinking: "smooth",
    formatOnPaste: true,
    padding: { top: 12, bottom: 12 },
    scrollbar: {
      vertical: "visible",
      horizontal: "visible",
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  };

  return (
    <div className="border border-border-default rounded-xl overflow-hidden bg-bg-surface w-full h-full">
      <Editor
        height={height}
        language={language}
        theme="vs-dark"
        value={value}
        onChange={handleEditorChange}
        options={editorOptions}
        loading={
          <div className="flex items-center justify-center h-full bg-bg-surface text-xs font-semibold text-text-secondary font-mono animate-pulse">
            Loading Monaco Sandbox...
          </div>
        }
      />
    </div>
  );
}

export default CodeEditor;
