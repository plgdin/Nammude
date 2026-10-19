import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { SEED_USERS } from '@/mocks/auth.fixtures';

const TestAuthConsumer = () => {
  const { user, profile, isAuthenticated, signInWithMockUser, signOut } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Guest'}</div>
      <div data-testid="user-email">{user?.email || 'no-email'}</div>
      <div data-testid="profile-name">{profile?.full_name || 'no-name'}</div>
      <button onClick={() => signInWithMockUser(SEED_USERS[0])}>Sign In Sarah</button>
      <button onClick={() => signInWithMockUser(SEED_USERS[2])}>Sign In Marian</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};

describe('Authentication Context & Protected Operations', () => {
  it('manages authentication state transitions and seed persona sign-in', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Initial state (by default Sarah in dev mock mode)
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('sarah.owner@harborcafe.com');

    // Switch to Marian
    await act(async () => {
      screen.getByText('Sign In Marian').click();
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('marian.owner@marianbistro.com');
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Marian Vance');

    // Sign out
    await act(async () => {
      screen.getByText('Sign Out').click();
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Guest');
  });
});
