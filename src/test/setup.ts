import '@testing-library/jest-dom';
import { vi } from 'vitest';

// In automated unit and component testing, stub mock auth mode to ensure deterministic execution
vi.stubEnv('VITE_ENABLE_DEV_MOCK_AUTH', 'true');
vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'placeholder-key');
