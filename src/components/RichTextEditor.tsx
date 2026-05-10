import { useState } from 'react';
import { Bold, Italic, BookOpen, X } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onInsertScripture?: (verse: string) => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write your post...',
  maxLength = 2000,
  onInsertScripture,
}: RichTextEditorProps) {
  const [showScriptureInput, setShowScriptureInput] = useState(false);
  const [scriptureRef, setScriptureRef] = useState('');

  const applyFormatting = (format: 'bold' | 'italic') => {
    const textarea = document.getElementById('rich-text-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (!selectedText) return;

    let formatted = '';
    if (format === 'bold') {
      formatted = `**${selectedText}**`;
    } else if (format === 'italic') {
      formatted = `*${selectedText}*`;
    }

    const newValue = value.substring(0, start) + formatted + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formatted.length, start + formatted.length);
    }, 0);
  };

  const insertScripture = () => {
    if (!scriptureRef.trim()) return;
    const reference = `[${scriptureRef}]`;
    const newValue = value + (value ? '\n' : '') + reference;
    onChange(newValue);
    setScriptureRef('');
    setShowScriptureInput(false);
    if (onInsertScripture) onInsertScripture(scriptureRef);
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-lg">
        <button
          onClick={() => applyFormatting('bold')}
          className="p-2 rounded hover:bg-white/10 transition-colors text-navy-400 hover:text-white"
          title="Bold (Cmd+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => applyFormatting('italic')}
          className="p-2 rounded hover:bg-white/10 transition-colors text-navy-400 hover:text-white"
          title="Italic (Cmd+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <div className="h-6 w-px bg-white/10" />
        <button
          onClick={() => setShowScriptureInput(!showScriptureInput)}
          className="p-2 rounded hover:bg-white/10 transition-colors text-navy-400 hover:text-white flex items-center gap-2"
          title="Insert Scripture Reference"
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-xs font-medium">Scripture</span>
        </button>
        <div className="flex-1" />
        <span className="text-xs text-navy-500">
          {value.length}/{maxLength}
        </span>
      </div>

      {/* Scripture Reference Input */}
      {showScriptureInput && (
        <div className="flex gap-2 p-3 bg-gold-400/5 border border-gold-400/20 rounded-lg">
          <input
            type="text"
            value={scriptureRef}
            onChange={(e) => setScriptureRef(e.target.value)}
            placeholder="e.g., John 3:16"
            className="flex-1 bg-transparent border border-gold-400/30 rounded px-3 py-2 text-sm text-white placeholder:text-navy-600 focus:outline-none focus:border-gold-400/60"
            onKeyPress={(e) => {
              if (e.key === 'Enter') insertScripture();
            }}
          />
          <button
            onClick={insertScripture}
            className="px-4 py-2 bg-gold-400/20 hover:bg-gold-400/30 text-gold-400 rounded font-medium text-sm transition-colors"
          >
            Insert
          </button>
          <button
            onClick={() => {
              setShowScriptureInput(false);
              setScriptureRef('');
            }}
            className="p-2 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-navy-500" />
          </button>
        </div>
      )}

      {/* Text Area */}
      <textarea
        id="rich-text-editor"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-4 py-3 text-sm text-white placeholder:text-navy-700 focus:outline-none focus:border-gold-400/30 resize-none"
        rows={6}
      />

      {/* Formatting Help */}
      <div className="text-xs text-navy-600 space-y-1">
        <p>
          <strong>**text**</strong> for bold, <em>*text*</em> for italic
        </p>
        <p>Use [Scripture Reference] to link to Bible passages</p>
      </div>
    </div>
  );
}
