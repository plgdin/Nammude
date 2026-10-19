import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from '@/features/auth/AuthContext';
import { OrganizationProvider, useOrganization } from '@/features/organization/OrganizationContext';

const TestOrgConsumer = () => {
  const { currentOrganization, currentBranch, switchBranch, permittedBranches } = useOrganization();
  return (
    <div>
      <div data-testid="org-name">{currentOrganization?.name || 'no-org'}</div>
      <div data-testid="branch-name">{currentBranch?.name || 'no-branch'}</div>
      <div data-testid="branch-count">{permittedBranches.length}</div>
      {permittedBranches.map((b) => (
        <button key={b.id} onClick={() => switchBranch(b.id)}>
          Select {b.name}
        </button>
      ))}
    </div>
  );
};

describe('Organization Context & Multi-Tenant Management', () => {
  it('loads active organization and switches between branches', async () => {
    render(
      <AuthProvider>
        <OrganizationProvider>
          <TestOrgConsumer />
        </OrganizationProvider>
      </AuthProvider>
    );

    // Initial tenant is Harbor Café with 2 branches
    expect(screen.getByTestId('org-name')).toHaveTextContent('Harbor Café');
    expect(screen.getByTestId('branch-name')).toHaveTextContent('Main Branch');
    expect(screen.getByTestId('branch-count')).toHaveTextContent('2');

    // Switch branch to Uptown Kiosk
    await act(async () => {
      screen.getByText('Select Uptown Kiosk').click();
    });

    expect(screen.getByTestId('branch-name')).toHaveTextContent('Uptown Kiosk');
  });
});
