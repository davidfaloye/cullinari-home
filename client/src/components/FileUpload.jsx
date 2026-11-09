import { useRef, useState } from 'react';
import { api } from '../api.js';

function sizeLabel(bytes) {
  if (!bytes) return '';
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

// One upload slot. `files` is an array of uploaded files ({id,url,name,mime,size}).
export default function FileUpload({ kind, label, hint, accept, files, multiple = false, onChange, error, disabled }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const id = `upload-${kind}`;

  async function pick(e) {
    const list = Array.from(e.target.files || []);
    e.target.value = '';
    if (!list.length) return;
    setBusy(true);
    setMsg('');
    try {
      let last;
      for (const f of list) last = await api.upload(`/api/application/files/${kind}`, f);
      onChange(last.application);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(f) {
    setMsg('');
    try {
      const d = await api.del(`/api/application/files/${kind}${kind === 'menu' ? `/${f.id}` : ''}`);
      onChange(d.application);
    } catch (err) {
      setMsg(err.message);
    }
  }

  const shown = files.filter(Boolean);
  const canAdd = multiple || shown.length === 0;

  return (
    <div className={`field upload${error || msg ? ' field--error' : ''}`}>
      <span className="field__label" id={`${id}-label`}>{label}</span>
      {hint && <p className="field__hint">{hint}</p>}
      {shown.length > 0 && (
        <ul className="upload__list">
          {shown.map((f) => (
            <li key={f.id || f.url}>
              {f.mime?.startsWith('image/') ? <img src={f.url} alt="" /> : <span className="upload__doc" aria-hidden="true">{(f.name?.split('.').pop() || 'file').slice(0, 4)}</span>}
              <a href={f.url} target="_blank" rel="noreferrer">{f.name}</a>
              <span className="muted">{sizeLabel(f.size)}</span>
              {!disabled && (
                <button type="button" className="link-btn" onClick={() => remove(f)}>
                  Remove<span className="sr-only"> {f.name}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!disabled && (canAdd || !multiple) && (
        <>
          <input ref={input} id={id} type="file" accept={accept} multiple={multiple} onChange={pick} className="sr-only" aria-labelledby={`${id}-label`} />
          <button type="button" className="btn btn--outline btn--sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : shown.length && !multiple ? 'Replace file' : multiple && shown.length ? 'Add another file' : 'Choose file'}
          </button>
        </>
      )}
      {(msg || error) && <p className="field__error">{msg || error}</p>}
    </div>
  );
}
