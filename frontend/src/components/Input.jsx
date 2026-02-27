/**
 * Input — styled form controls matching the Forge design system.
 *
 * Usage:
 *   <Input label="Email" type="email" value={email} onChange={setEmail} />
 *   <Input label="Notes" as="textarea" rows={4} />
 *   <Select label="Role" options={roleOptions} value={role} onChange={setRole} />
 */
import { useState, forwardRef } from 'react';

const BASE_INPUT_STYLE = {
  width: '100%',
  background: '#0c1120',
  border: '1px solid #18233d',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '13px',
  color: '#dde6f5',
  outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

// ── Input ─────────────────────────────────────────────────────────────────────

export const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    type = 'text',
    as: Tag = 'input',
    prefix,
    suffix,
    style: extraStyle = {},
    containerStyle = {},
    ...props
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  const inputStyle = {
    ...BASE_INPUT_STYLE,
    borderColor: hasError ? '#ff3e5e80'
               : focused  ? '#00d4ff60'
               : '#18233d',
    resize: Tag === 'textarea' ? 'vertical' : undefined,
    minHeight: Tag === 'textarea' ? '90px' : undefined,
    paddingLeft: prefix ? '34px' : '12px',
    paddingRight: suffix ? '36px' : '12px',
    ...extraStyle,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...containerStyle }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#8899bb', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            color: '#8899bb', fontSize: '13px', pointerEvents: 'none',
          }}>
            {prefix}
          </span>
        )}

        <Tag
          ref={ref}
          type={type}
          style={inputStyle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />

        {suffix && (
          <span style={{
            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
            color: '#8899bb', fontSize: '13px',
          }}>
            {suffix}
          </span>
        )}
      </div>

      {(error || hint) && (
        <p style={{
          margin: 0, fontSize: '12px',
          color: hasError ? '#ff3e5e' : '#8899bb',
        }}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

// ── PasswordInput ─────────────────────────────────────────────────────────────

export function PasswordInput(props) {
  const [show, setShow] = useState(false);

  return (
    <Input
      {...props}
      type={show ? 'text' : 'password'}
      suffix={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{
            background: 'none', border: 'none', color: '#8899bb',
            cursor: 'pointer', padding: 0, fontSize: '13px',
          }}
          title={show ? 'Hide password' : 'Show password'}
        >
          {show ? '🙈' : '👁'}
        </button>
      }
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

export function Select({ label, hint, error, options = [], containerStyle = {}, style: extraStyle = {}, ...props }) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...containerStyle }}>
      {label && (
        <label style={{ fontSize: '12px', fontWeight: 500, color: '#8899bb', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}

      <select
        style={{
          ...BASE_INPUT_STYLE,
          borderColor: hasError ? '#ff3e5e80' : focused ? '#00d4ff60' : '#18233d',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238899bb' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '32px',
          ...extraStyle,
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      >
        {options.map(({ value, label: optLabel, disabled: optDisabled }) => (
          <option key={value} value={value} disabled={optDisabled} style={{ background: '#090d1a' }}>
            {optLabel}
          </option>
        ))}
      </select>

      {(error || hint) && (
        <p style={{ margin: 0, fontSize: '12px', color: hasError ? '#ff3e5e' : '#8899bb' }}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

// ── Checkbox ──────────────────────────────────────────────────────────────────

export function Checkbox({ label, checked, onChange, disabled = false, style = {} }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      fontSize: '13px', color: '#dde6f5', userSelect: 'none', ...style,
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        style={{ width: '15px', height: '15px', accentColor: '#00d4ff', cursor: 'inherit' }}
      />
      {label}
    </label>
  );
}

// ── FormGroup ─────────────────────────────────────────────────────────────────

export function FormGroup({ children, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', ...style }}>
      {children}
    </div>
  );
}

export default Input;
