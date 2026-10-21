import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react';
import {
  fetchNihConditionSuggestions,
  type NihSuggestion,
} from '../data/nih';

export type SearchVariant = 'hero' | 'header' | 'default';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  /** When a suggestion maps to a local FAA condition. */
  onSelectCondition?: (conditionId: string, suggestion: NihSuggestion) => void;
  /** When a suggestion has no local match (still useful for search). */
  onSelectUnmatched?: (suggestion: NihSuggestion) => void;
  placeholder?: string;
  variant?: SearchVariant;
  submitLabel?: string;
  className?: string;
  inputStyle?: CSSProperties;
  buttonStyle?: CSSProperties;
}

const DEBOUNCE_MS = 250;

export default function ConditionSearchInput({
  value,
  onChange,
  onSearch,
  onSelectCondition,
  onSelectUnmatched,
  placeholder = 'Search conditions, medications…',
  variant = 'default',
  submitLabel = 'Search',
  className = 'stack-form',
  inputStyle,
  buttonStyle,
}: Props) {
  const listboxId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<NihSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      const result = await fetchNihConditionSuggestions(q, controller.signal);
      if (controller.signal.aborted) return;
      setSuggestions(result.suggestions);
      setLoading(false);
      setOpen(result.suggestions.length > 0);
      setActiveIndex(result.suggestions.length > 0 ? 0 : -1);
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function selectSuggestion(suggestion: NihSuggestion) {
    const matchedId = suggestion.matchedConditionIds[0];
    onChange(suggestion.label);
    setOpen(false);
    setActiveIndex(-1);
    if (matchedId && onSelectCondition) {
      onSelectCondition(matchedId, suggestion);
      return;
    }
    if (onSelectUnmatched) {
      onSelectUnmatched(suggestion);
      return;
    }
    onSearch(suggestion.label);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    // Search button always runs free-text search (medications + conditions).
    setOpen(false);
    setActiveIndex(-1);
    onSearch(q);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === 'Enter' && open && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  }

  const isHeader = variant === 'header';
  const defaultInputStyle: CSSProperties = isHeader
    ? {
        background: '#243e6b',
        border: '1px solid #345487',
        borderRadius: 4,
        padding: '7px 14px',
        color: '#ffffff',
        fontSize: '0.875rem',
        width: 240,
        fontFamily: "'Inter', sans-serif",
        outline: 'none',
      }
    : variant === 'hero'
      ? {
          background: '#ffffff',
          border: '2px solid #ffffff',
          borderRadius: 6,
          padding: '14px 20px',
          fontSize: '1rem',
          fontFamily: "'Inter', sans-serif",
          color: '#1e293b',
          outline: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }
      : {
          minWidth: 0,
          border: '2px solid #3b7fc4',
          borderRadius: 6,
          padding: '12px 18px',
          fontSize: '1rem',
          fontFamily: "'Inter', sans-serif",
          color: '#1e293b',
          outline: 'none',
          background: '#ffffff',
        };

  const defaultButtonStyle: CSSProperties = isHeader
    ? {
        background: '#3b7fc4',
        border: 'none',
        borderRadius: 4,
        padding: '7px 16px',
        color: '#ffffff',
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: 'nowrap',
      }
    : variant === 'hero'
      ? {
          background: '#3b7fc4',
          border: '2px solid #3b7fc4',
          borderRadius: 6,
          padding: '14px 28px',
          color: '#ffffff',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }
      : {
          background: '#1b2d4f',
          border: 'none',
          borderRadius: 6,
          padding: '12px 24px',
          color: '#ffffff',
          fontSize: '0.95rem',
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        };

  const panelBg = isHeader ? '#1b2d4f' : '#ffffff';
  const panelBorder = isHeader ? '#345487' : '#e2e8f0';
  const optionColor = isHeader ? '#e2e8f0' : '#1e293b';
  const mutedColor = isHeader ? '#7fa8d0' : '#6b7a99';
  const activeBg = isHeader ? '#243e6b' : '#e8f2fb';

  return (
    <form
      ref={rootRef}
      className={className}
      onSubmit={handleSubmit}
      style={{ position: 'relative', width: variant === 'hero' ? '100%' : undefined }}
    >
      <div className="search-input-wrap" style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
          }
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          style={{ ...defaultInputStyle, ...inputStyle, width: '100%' }}
        />
        {open && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            aria-label="Condition suggestions"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 'calc(100% + 4px)',
              zIndex: 60,
              margin: 0,
              padding: '6px 0',
              listStyle: 'none',
              background: panelBg,
              border: `1px solid ${panelBorder}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            {suggestions.map((suggestion, index) => {
              const matched = suggestion.matchedConditionIds.length > 0;
              const active = index === activeIndex;
              return (
                <li
                  key={suggestion.keyId}
                  id={`${listboxId}-opt-${index}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectSuggestion(suggestion);
                  }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    background: active ? activeBg : 'transparent',
                    color: optionColor,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{suggestion.label}</div>
                  <div style={{ fontSize: '0.75rem', color: mutedColor, marginTop: 2 }}>
                    {matched
                      ? 'Matches FAA guidance in this catalog'
                      : 'Common medical name — may not be in FAA catalog'}
                  </div>
                </li>
              );
            })}
            {loading && (
              <li
                style={{
                  padding: '8px 14px',
                  fontSize: '0.75rem',
                  color: mutedColor,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Updating suggestions…
              </li>
            )}
          </ul>
        )}
      </div>
      <button type="submit" style={{ ...defaultButtonStyle, ...buttonStyle }}>
        {submitLabel}
      </button>
    </form>
  );
}
