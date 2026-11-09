import { Logo, AdireField } from './Brand.jsx';

export default function AuthShell({ title, intro, children, aside }) {
  return (
    <div className="auth">
      <div className="auth__panel">
        <Logo />
        <div className="auth__body">
          <h1>{title}</h1>
          {intro && <p className="auth__intro">{intro}</p>}
          {children}
        </div>
      </div>
      <div className="auth__cloth">
        <AdireField id="adire-auth" />
        {aside && <div className="auth__aside">{aside}</div>}
      </div>
    </div>
  );
}
