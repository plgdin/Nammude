import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { SEED_USERS } from '@/mocks/auth.fixtures';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Coffee, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithPassword, signInWithMockUser, error, clearError, isMockMode } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const destination = (location.state as any)?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email || !password) return;

    setIsLoading(true);
    const result = await signInWithPassword(email, password);
    setIsLoading(false);

    if (result.success) {
      navigate(destination, { replace: true });
    }
  };

  const handleQuickSeedLogin = (userFixture: (typeof SEED_USERS)[0]) => {
    clearError();
    signInWithMockUser(userFixture);
    navigate(destination, { replace: true });
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-canvas p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-lg">
            <Coffee className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Restaurant OS Platform
          </h1>
          <p className="text-xs text-gray-400">
            Secure, multi-tenant restaurant operations & management
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-surface-border bg-surface shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sign In</CardTitle>
              <Badge variant={isMockMode ? 'warning' : 'success'} size="sm">
                {isMockMode ? 'Dev Mock Mode' : 'Live Supabase Auth'}
              </Badge>
            </div>
            <CardDescription>
              Enter your credentials to access your restaurant branch
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-rose-800/80 bg-rose-950/50 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Staff Email Address"
                type="email"
                placeholder="name@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-semibold shadow-md min-h-[48px]"
                isLoading={isLoading}
              >
                Sign In to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            {/* Development Seed Accounts (Only in Mock Mode) */}
            {isMockMode && (
              <div className="mt-6 pt-5 border-t border-surface-border space-y-3">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="font-semibold uppercase tracking-wider text-gray-300 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Quick Dev Login (Seed Personas)
                  </span>
                  <span>Select to test</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {SEED_USERS.map((seed) => (
                    <button
                      key={seed.id}
                      type="button"
                      onClick={() => handleQuickSeedLogin(seed)}
                      className="flex flex-col text-left p-2.5 rounded-xl border border-surface-border bg-surface-elevated hover:bg-surface-active hover:border-gray-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">{seed.fullName}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-surface text-gray-300">
                          {seed.role}
                        </span>
                      </div>
                      <span className="text-[11px] text-brand-fg/80 mt-0.5 font-medium">
                        {seed.organizationName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>PostgreSQL Row Level Security (RLS) Enforced</span>
        </div>
      </div>
    </div>
  );
};
