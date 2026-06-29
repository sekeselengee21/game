import { useState, useRef, useEffect } from "react";

interface CustomSelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  placeholder?: string;
  label?: string;
}

export default function CustomSelect<T = string>({ value, onChange, options, placeholder, label }: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((opt) => opt.value === value)?.label || placeholder;

  return (
    <fieldset className={`custom-select-field ${open ? "active" : ""}`} ref={containerRef}>
      {label && <legend className="custom-select-legend">{label}</legend>}

      <div className="custom-select">
        <div className="custom-select-trigger" onClick={() => setOpen(!open)}>
          {selectedLabel}
          <span className={`arrow ${open ? "open" : ""}`} />
        </div>

        {open && (
          <div className={`custom-options ${open ? "open" : ""}`}>
            {options.map((opt) => (
              <div
                key={String(opt.value)}
                className={`custom-option ${opt.value === value ? "selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </fieldset>
  );
}
