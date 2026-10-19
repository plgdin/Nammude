import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '@/app/App';

describe('App Shell and Core Route Rendering', () => {
  it('renders application brand and navigation shell', async () => {
    render(<App />);

    // Brand and branch verification
    expect(screen.getByText('Harbor Café')).toBeInTheDocument();
    expect(screen.getAllByText('Main Branch').length).toBeGreaterThan(0);

    // Active screen navigation
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inventory').length).toBeGreaterThan(0);
  });
});
