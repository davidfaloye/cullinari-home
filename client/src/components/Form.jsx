import { useId, useState } from 'react';

export function Field({ label, hint, error, children, id: idProp, optional }) {
  const auto = useId();
  const id = idProp || auto;
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {hint && <p className="field__hint" id={hintId}>{hint}</p>}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && <p className="field__error" id={errId}>{error}</p>}
    </div>
  );
}

export function TextField({ label, hint, error, optional, value, onChange, type = 'text', ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {(a) => <input {...a} {...rest} type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function TextArea({ label, hint, error, optional, value, onChange, rows = 3, ...rest }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {(a) => <textarea {...a} {...rest} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}

export function PasswordField({ label = 'Password', error, value, onChange, autoComplete = 'current-password', hint }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error} hint={hint}>
      {(a) => (
        <div className="password">
          <input {...a} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required />
          <button type="button" className="password__toggle" onClick={() => setShow((s) => !s)} aria-pressed={show}>
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
      )}
    </Field>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div className="form-error" role="alert">
      {children}
    </div>
  );
}
