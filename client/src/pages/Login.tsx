import { useState } from 'react';
import { AuthForms } from '../components/AuthForms';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  return <AuthForms mode={mode} onSwitch={() => setMode(mode === 'login' ? 'register' : 'login')} />;
}
