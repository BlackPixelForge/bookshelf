import { useState } from 'react';
import { AuthForms } from '../components/AuthForms';

export function Register() {
  const [mode, setMode] = useState<'login' | 'register'>('register');

  return <AuthForms mode={mode} onSwitch={() => setMode(mode === 'login' ? 'register' : 'login')} />;
}
