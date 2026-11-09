import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell.jsx';
import { TextField, PasswordField, FormError } from '../components/Form.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { getPlan } from '../../../shared/plans.js';

export default function Signup() {
  const [params] = useSearchParams();
  const plan = getPlan(params.get('plan'));
  const nav = useNavigate();
  const { setUser } = useAuth();
  const [f, setF] = useState({ restaurantName: '', firstName: '', lastName: '', email: '', phone: '', password: '', agreeTerms: false });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const { user } = await api.post('/api/auth/signup', f);
      if (plan) {
        await api.put('/api/application', { plan: plan.code }).catch(() => {});
      }
      setUser(user);
      nav('/dashboard', { replace: true });
    } catch (err) {
      setErrors(err.fields || {});
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your Cullinari account"
      intro={plan ? `You picked the ${plan.name} plan. You can change it before you send your details.` : 'Next you will choose a plan and send us your restaurant details.'}
      aside={<p>Your app is live 2 to 5 business days after your application is approved and paid.</p>}
    >
      <form className="stack" onSubmit={submit} noValidate>
        <FormError>{formError}</FormError>
        <TextField label="Restaurant name" value={f.restaurantName} onChange={set('restaurantName')} error={errors.restaurantName} autoComplete="organization" required />
        <div className="row-2">
          <TextField label="First name" value={f.firstName} onChange={set('firstName')} error={errors.firstName} autoComplete="given-name" required />
          <TextField label="Last name" value={f.lastName} onChange={set('lastName')} error={errors.lastName} autoComplete="family-name" required />
        </div>
        <TextField label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" inputMode="email" required />
        <TextField label="Phone number" type="tel" value={f.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" inputMode="tel" placeholder="0803 123 4567" required />
        <PasswordField value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint="At least 8 characters." />
        <div className={`check${errors.agreeTerms ? ' check--error' : ''}`}>
          <input id="agree" type="checkbox" checked={f.agreeTerms} onChange={(e) => set('agreeTerms')(e.target.checked)} aria-describedby={errors.agreeTerms ? 'agree-err' : undefined} />
          <label htmlFor="agree">
            I agree to the <Link to="/terms" target="_blank">Cullinari terms of service</Link>.
          </label>
        </div>
        {errors.agreeTerms && <p className="field__error" id="agree-err">{errors.agreeTerms}</p>}
        <button className="btn btn--primary btn--block" disabled={busy}>
          {busy ? 'Creating your account…' : 'Create account'}
        </button>
        <p className="auth__switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
