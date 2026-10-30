"use client";

import { useEffect, useRef, useState } from "react";

export type RoleSelectOption = {
  value: string;
  label: string;
  description: string;
  badge?: string;
};

type RoleSelectProps = {
  value: string;
  options: RoleSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
};

export default function RoleSelect({ value, options, onChange, placeholder = "Choose a role…", ariaLabel }: RoleSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={"role-select " + (open ? "is-open" : "")} ref={rootRef}>
      <button type="button" className="role-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}>
        <span className="role-select-current">
          <strong>{selected?.label ?? placeholder}</strong>
          <small>{selected?.description ?? "Select the access level for this staff member"}</small>
        </span>
        <span className={"role-select-chevron " + (open ? "up" : "")} aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="role-select-menu" role="listbox" aria-label={ariaLabel}>
          <div className="role-select-menu-heading"><span>AVAILABLE ROLES</span><small>{options.length} {options.length === 1 ? "role" : "roles"}</small></div>
          {options.map(option => {
            const active = option.value === value;
            return (
              <button type="button" role="option" aria-selected={active} className={"role-select-option " + (active ? "selected" : "")} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }}>
                <span className="role-select-option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
                {option.badge && <span className="role-select-badge">{option.badge}</span>}
                <span className="role-select-check" aria-hidden="true">{active ? "✓" : ""}</span>
              </button>
            );
          })}
          {!options.length && <p className="role-select-empty">No roles are currently available to assign.</p>}
        </div>
      )}
    </div>
  );
}
