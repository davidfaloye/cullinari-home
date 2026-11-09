import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { TextField, TextArea, Field, FormError } from './Form.jsx';
import FileUpload from './FileUpload.jsx';
import { PLANS, EXTRA_OPTIONS, MENU_LAYOUTS, getPlan, formatNaira } from '../../../shared/plans.js';

const STEPS = ['Plan', 'Restaurant', 'App look', 'Menu and ordering', 'Review and send'];

const FIELD_STEP = {
  plan: 0,
  businessName: 1, appName: 1, tagline: 1, cuisine: 1, phone: 1, whatsapp: 1, email: 1, address: 1, city: 1, state: 1, hours: 1, branches: 1,
  logo: 2, splash: 2, primaryColor: 2, secondaryColor: 2, menuLayout: 2, extraOptions: 2, customDomain: 2, customFeatures: 2,
  menu: 3, menuLink: 3, offersPickup: 3, offersDelivery: 3, deliveryNotes: 3, hasPlayAccount: 3, notes: 3,
};

const FIELD_LABEL = {
  plan: 'Plan', businessName: 'Restaurant name', appName: 'App name', phone: 'Phone', email: 'Email', address: 'Address', city: 'City',
  state: 'State', hours: 'Opening hours', branches: 'Branches', logo: 'Logo', primaryColor: 'Main colour', extraOptions: 'Extra options',
  menu: 'Menu', offersPickup: 'Pickup or delivery',
};

const EMPTY = {
  businessName: '', appName: '', tagline: '', cuisine: '', phone: '', whatsapp: '', email: '', address: '', city: '', state: '', hours: '',
  branches: [], primaryColor: '#22306e', secondaryColor: '#e8892b', menuLayout: 'list', extraOptions: [], offersDelivery: false,
  offersPickup: true, deliveryNotes: '', menuLink: '', customDomain: '', customFeatures: '', hasPlayAccount: '', notes: '',
};

function initialDetails(app, user) {
  const d = { ...EMPTY, ...Object.fromEntries(Object.entries(app.details || {}).filter(([, v]) => v !== null && v !== undefined)) };
  if (!d.businessName) d.businessName = user.restaurantName || '';
  if (!d.appName) d.appName = (user.restaurantName || '').slice(0, 30);
  if (!d.email) d.email = user.email || '';
  if (!d.phone) d.phone = user.phone || '';
  return d;
}

function ColorField({ label, value, onChange, error, optional }) {
  return (
    <Field label={label} error={error} optional={optional} hint="Pick a colour or type a code like #22306E.">
      {(a) => (
        <div className="color">
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onChange={(e) => onChange(e.target.value)} aria-label={`${label} picker`} />
          <input {...a} value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} />
        </div>
      )}
    </Field>
  );
}

export default function ApplicationForm({ app, user, onChange }) {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState(app.plan);
  const [d, setD] = useState(() => initialDetails(app, user));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [missing, setMissing] = useState(null);
  const [busy, setBusy] = useState(false);
  const top = useRef(null);
  const p = getPlan(plan);

  useEffect(() => {
    top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [step]);

  const set = (k) => (v) => setD((s) => ({ ...s, [k]: v }));

  async function save() {
    const { application } = await api.put('/api/application', { plan, details: d });
    onChange(application);
    setD(initialDetails(application, user));
    return application;
  }

  async function next(e) {
    e?.preventDefault();
    if (step === 0 && !plan) {
      setErrors({ plan: 'Choose a plan to continue.' });
      return;
    }
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      await save();
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setFormError('');
    setMissing(null);
    try {
      await save();
      const { application } = await api.post('/api/application/submit');
      onChange(application);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) {
        setMissing(err.fields);
        setErrors(err.fields);
      } else {
        setFormError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const branchCap = p?.limits.branches;
  const extraBranchesAllowed = branchCap === null ? Infinity : (branchCap || 1) - 1;

  function setBranch(i, k, v) {
    setD((s) => ({ ...s, branches: s.branches.map((b, j) => (j === i ? { ...b, [k]: v } : b)) }));
  }

  function toggleOption(code) {
    setD((s) => {
      const has = s.extraOptions.includes(code);
      return { ...s, extraOptions: has ? s.extraOptions.filter((c) => c !== code) : [...s.extraOptions, code] };
    });
  }

  return (
    <div className="appform" ref={top}>
      <ol className="stepper" aria-label="Application steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'is-current' : i < step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}>
            <button type="button" onClick={() => (i < step || app.plan ? setStep(i) : null)} disabled={i > step && !app.plan}>
              <span className="stepper__n">{i + 1}</span>
              <span className="stepper__label">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      <form className="panel" onSubmit={next} noValidate>
        <FormError>{formError}</FormError>

        {step === 0 && (
          <fieldset className="stack">
            <legend className="panel__title">Choose your plan</legend>
            <p className="muted">You pay nothing now. Payment opens after our team approves your application.</p>
            <div className="plan-pick" role="radiogroup" aria-label="Plan">
              {PLANS.map((x) => (
                <label key={x.code} className={`plan-pick__opt${plan === x.code ? ' is-on' : ''}`}>
                  <input type="radio" name="plan" value={x.code} checked={plan === x.code} onChange={() => setPlan(x.code)} />
                  <span className="plan-pick__name">{x.name}</span>
                  <span className="plan-pick__price">{formatNaira(x.monthly)} a month</span>
                  <span className="plan-pick__setup">+ {formatNaira(x.setup)} setup, once</span>
                  <span className="plan-pick__caps">
                    {x.rows.slice(0, 3).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ')}
                  </span>
                  <span className="plan-pick__inc">{x.inc.join('. ')}.</span>
                </label>
              ))}
            </div>
            {errors.plan && <p className="field__error">{errors.plan}</p>}
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="stack">
            <legend className="panel__title">Your restaurant</legend>
            <div className="row-2">
              <TextField label="Restaurant name" value={d.businessName} onChange={set('businessName')} error={errors.businessName} hint="As customers know it." />
              <TextField label="App name" value={d.appName} onChange={set('appName')} error={errors.appName} maxLength={30} hint="Shown under the app icon. Up to 30 characters." />
            </div>
            <div className="row-2">
              <TextField label="Short tagline" optional value={d.tagline} onChange={set('tagline')} maxLength={80} hint="For example: Abuja’s favourite amala since 2015." />
              <TextField label="Kind of food" optional value={d.cuisine} onChange={set('cuisine')} hint="For example: Nigerian, grills, pastries." />
            </div>
            <div className="row-2">
              <TextField label="Phone for customers" type="tel" value={d.phone} onChange={set('phone')} error={errors.phone} />
              <TextField label="WhatsApp number" type="tel" optional value={d.whatsapp} onChange={set('whatsapp')} />
            </div>
            <TextField label="Email for orders and support" type="email" value={d.email} onChange={set('email')} error={errors.email} />
            <TextField label={p?.limits.branches === 1 ? 'Address' : 'Main branch address'} value={d.address} onChange={set('address')} error={errors.address} autoComplete="street-address" />
            <div className="row-2">
              <TextField label="City" value={d.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" />
              <TextField label="State" value={d.state} onChange={set('state')} error={errors.state} autoComplete="address-level1" />
            </div>
            <TextArea label="Opening hours" value={d.hours} onChange={set('hours')} error={errors.hours} rows={3} hint="For example: Mon–Sat 8am–9pm, Sun 12pm–8pm." />

            {extraBranchesAllowed > 0 && (
              <div className="branches">
                <h3>Other branches</h3>
                <p className="muted">
                  {branchCap === null
                    ? 'Add every other location. Pro covers as many branches as you need.'
                    : `The ${p.name} plan covers ${branchCap} branches, including the main one above.`}
                </p>
                {d.branches.map((b, i) => (
                  <div className="branch" key={i}>
                    <TextField label={`Branch ${i + 2} name`} value={b.name} onChange={(v) => setBranch(i, 'name', v)} />
                    <TextField label={`Branch ${i + 2} address`} value={b.address} onChange={(v) => setBranch(i, 'address', v)} />
                    <button type="button" className="link-btn" onClick={() => setD((s) => ({ ...s, branches: s.branches.filter((_, j) => j !== i) }))}>
                      Remove branch {i + 2}
                    </button>
                  </div>
                ))}
                {d.branches.length < extraBranchesAllowed && (
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => setD((s) => ({ ...s, branches: [...s.branches, { name: '', address: '' }] }))}>
                    Add a branch
                  </button>
                )}
                {errors.branches && <p className="field__error">{errors.branches}</p>}
              </div>
            )}
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="stack">
            <legend className="panel__title">How your app looks</legend>
            <FileUpload kind="logo" label="Logo" hint="PNG, JPG or WebP. A square logo on a plain background works best. Up to 5 MB." accept="image/png,image/jpeg,image/webp" files={[app.files.logo]} onChange={onChange} error={errors.logo} />
            <div className="row-2">
              <ColorField label="Main colour" value={d.primaryColor} onChange={set('primaryColor')} error={errors.primaryColor} />
              <ColorField label="Second colour" optional value={d.secondaryColor} onChange={set('secondaryColor')} error={errors.secondaryColor} />
            </div>

            {p?.app.customSplash ? (
              <FileUpload kind="splash" label="Splash screen artwork" hint="Optional. Shown while the app opens. Portrait, at least 1242 × 2436 px. Without it, we use your logo on your main colour." accept="image/png,image/jpeg,image/webp" files={[app.files.splash]} onChange={onChange} />
            ) : (
              <p className="notice">Starter apps open with your logo on your main colour. A custom splash screen comes with Growth and Pro.</p>
            )}

            {p && p.app.menuLayouts.length > 1 && (
              <fieldset className="choice">
                <legend>Menu layout</legend>
                {MENU_LAYOUTS.map((l) => (
                  <label key={l.code} className="choice__opt">
                    <input type="radio" name="menuLayout" checked={d.menuLayout === l.code} onChange={() => set('menuLayout')(l.code)} />
                    <span><b>{l.label}</b> {l.hint}</span>
                  </label>
                ))}
              </fieldset>
            )}

            {p && p.app.maxExtraOptions !== 0 && (
              <fieldset className="choice">
                <legend>Extra options</legend>
                <p className="field__hint">
                  {p.app.maxExtraOptions === null ? 'Pro includes all of these. Tick the ones you want.' : `Choose up to ${p.app.maxExtraOptions}.`}
                </p>
                {EXTRA_OPTIONS.map((o) => {
                  const on = d.extraOptions.includes(o.code);
                  const full = p.app.maxExtraOptions !== null && d.extraOptions.length >= p.app.maxExtraOptions;
                  return (
                    <label key={o.code} className="choice__opt">
                      <input type="checkbox" checked={on} disabled={!on && full} onChange={() => toggleOption(o.code)} />
                      <span>{o.label}</span>
                    </label>
                  );
                })}
                {errors.extraOptions && <p className="field__error">{errors.extraOptions}</p>}
              </fieldset>
            )}

            {p?.app.customDomain && (
              <TextField label="Your domain" optional value={d.customDomain} onChange={set('customDomain')} placeholder="yourrestaurant.ng" hint="We set up a download page and links that open your app. You keep ownership of the domain." />
            )}
            {p?.app.customFeatures && (
              <TextArea label="Custom features you want" optional value={d.customFeatures} onChange={set('customFeatures')} rows={4} hint="Describe what you need. We will scope it with you before building." />
            )}
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="stack">
            <legend className="panel__title">Menu and ordering</legend>
            <FileUpload kind="menu" label="Your menu" multiple hint="Dish names and prices. A PDF, photos of a printed menu, Excel or Word file are all fine. Up to 8 files." accept="image/png,image/jpeg,image/webp,application/pdf,.csv,.xlsx,.xls,.docx" files={app.files.menu} onChange={onChange} error={errors.menu} />
            <TextField label="Or a link to your menu" optional type="url" value={d.menuLink} onChange={set('menuLink')} error={errors.menuLink} placeholder="https://" hint="For example an Instagram highlight, Google Drive folder or existing website." />
            <fieldset className="choice">
              <legend>How customers get their food</legend>
              <label className="choice__opt">
                <input type="checkbox" checked={!!d.offersPickup} onChange={(e) => set('offersPickup')(e.target.checked)} />
                <span>Pickup from the restaurant</span>
              </label>
              <label className="choice__opt">
                <input type="checkbox" checked={!!d.offersDelivery} onChange={(e) => set('offersDelivery')(e.target.checked)} />
                <span>Delivery</span>
              </label>
              {errors.offersPickup && <p className="field__error">{errors.offersPickup}</p>}
            </fieldset>
            {d.offersDelivery && (
              <TextArea label="Delivery areas and fees" optional value={d.deliveryNotes} onChange={set('deliveryNotes')} hint="For example: Wuse and Garki ₦1,500, Gwarinpa ₦2,500." />
            )}
            <Field label="Do you have a Google Play developer account?" optional hint="Not required. If you have one, we can publish under it so the app lists your business as the developer.">
              {(a) => (
                <select {...a} value={d.hasPlayAccount} onChange={(e) => set('hasPlayAccount')(e.target.value)}>
                  <option value="">Choose one</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="unsure">Not sure</option>
                </select>
              )}
            </Field>
            <TextArea label="Anything else we should know" optional value={d.notes} onChange={set('notes')} rows={3} />
          </fieldset>
        )}

        {step === 4 && (
          <div className="stack">
            <h2 className="panel__title">Check and send</h2>
            {missing && (
              <div className="notice notice--bad" role="alert">
                <p>A few details are still missing:</p>
                <ul>
                  {Object.entries(missing).map(([k, msg]) => (
                    <li key={k}>
                      <button type="button" className="link-btn" onClick={() => setStep(FIELD_STEP[k] ?? 1)}>
                        {FIELD_LABEL[k] || k}
                      </button>
                      : {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Summary app={app} details={d} plan={p} onEdit={setStep} />
            <p className="muted">
              When you send this, our team reviews it, usually within one business day. You can’t edit it while it is
              being reviewed. If approved, you will pay {p ? formatNaira(p.setup + p.monthly) : ''} to start the build.
            </p>
          </div>
        )}

        <div className="panel__actions">
          {step > 0 && (
            <button type="button" className="btn btn--quiet" onClick={() => setStep((s) => s - 1)} disabled={busy}>
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button className="btn btn--primary" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</button>
          ) : (
            <button type="button" className="btn btn--palm" onClick={submit} disabled={busy}>
              {busy ? 'Sending…' : 'Send application for review'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export function Summary({ app, details: d, plan: p, onEdit }) {
  const opts = EXTRA_OPTIONS.filter((o) => d.extraOptions?.includes(o.code)).map((o) => o.label);
  const rows = [
    [0, 'Plan', p ? `${p.name}, ${formatNaira(p.monthly)} a month + ${formatNaira(p.setup)} setup` : '—'],
    [1, 'Restaurant', [d.businessName, d.cuisine].filter(Boolean).join(', ')],
    [1, 'App name', d.appName],
    [1, 'Contact', [d.phone, d.whatsapp && `WhatsApp ${d.whatsapp}`, d.email].filter(Boolean).join(' / ')],
    [1, 'Address', [d.address, d.city, d.state].filter(Boolean).join(', ')],
    [1, 'Hours', d.hours],
    [1, 'Other branches', d.branches?.filter((b) => b.name).map((b) => `${b.name} (${b.address})`).join('; ') || 'None'],
    [2, 'Logo', app.files.logo ? app.files.logo.name : 'Not uploaded'],
    [2, 'Colours', [d.primaryColor, d.secondaryColor].filter(Boolean).join(' and ')],
    ...(p?.app.customSplash ? [[2, 'Splash screen', app.files.splash ? app.files.splash.name : 'Use logo']] : []),
    ...(p && p.app.menuLayouts.length > 1 ? [[2, 'Menu layout', MENU_LAYOUTS.find((l) => l.code === d.menuLayout)?.label]] : []),
    ...(p && p.app.maxExtraOptions !== 0 ? [[2, 'Extra options', opts.join(', ') || 'None']] : []),
    ...(p?.app.customDomain ? [[2, 'Domain', d.customDomain || 'None']] : []),
    [3, 'Menu', [...app.files.menu.map((f) => f.name), d.menuLink].filter(Boolean).join(', ') || 'Not added'],
    [3, 'Ordering', [d.offersPickup && 'Pickup', d.offersDelivery && 'Delivery'].filter(Boolean).join(' and ') || 'Not chosen'],
  ];
  return (
    <dl className="summary">
      {rows.map(([s, k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v || '—'}</dd>
          {onEdit && (
            <button type="button" className="link-btn" onClick={() => onEdit(s)}>
              Edit<span className="sr-only"> {k}</span>
            </button>
          )}
        </div>
      ))}
    </dl>
  );
}
