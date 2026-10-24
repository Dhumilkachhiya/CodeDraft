import React from "react";

function TestCaseRow({ index, testCase, onChange, onRemove, canRemove }) {
  const handleFieldChange = (field, value) => {
    onChange(index, { ...testCase, [field]: value });
  };

  return (
    <div className="group relative bg-bg-surface border border-border-default rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#2a2a4e] hover:shadow-[0_0_24px_rgba(52,211,153,0.06)] animate-fade-in">
      {/* Accent top-bar */}
      <div className="h-[2px] bg-gradient-to-r from-primary via-secondary to-primary opacity-50" />

      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary/10 text-primary text-[11px] font-bold font-mono border border-primary/20">
              {index + 1}
            </span>
            <span className="text-[11px] font-bold text-primary tracking-[0.08em] uppercase font-sans">
              Test Case
            </span>
            <span className="text-[9px] font-mono text-text-muted/50 bg-bg-primary/50 px-2 py-0.5 rounded-md border border-border-default">
              HIDDEN
            </span>
          </div>
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all duration-200 p-1.5 rounded-lg hover:bg-error/10"
              aria-label="Remove test case"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {/* Input/Output fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Input Data
            </label>
            <textarea
              value={testCase.input}
              onChange={(e) => handleFieldChange("input", e.target.value)}
              placeholder='e.g. [2,7,11,15]\n9'
              rows="2"
              className="w-full bg-bg-primary/80 border border-border-default rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-bg-primary font-mono resize-none transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-muted">
              Expected Output
            </label>
            <textarea
              value={testCase.expectedOutput}
              onChange={(e) => handleFieldChange("expectedOutput", e.target.value)}
              placeholder="e.g. [0,1]"
              rows="2"
              className="w-full bg-bg-primary/80 border border-border-default rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-bg-primary font-mono resize-none transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestCaseRow;
