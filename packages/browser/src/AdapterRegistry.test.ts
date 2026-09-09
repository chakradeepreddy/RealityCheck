import { describe, it, expect, beforeEach } from 'vitest';
import { AdapterRegistry } from './AdapterRegistry';
import { SiteAdapter } from '@realitycheck/contracts';

describe('AdapterRegistry', () => {
  beforeEach(() => {
    AdapterRegistry.clear();
  });

  it('registers and resolves an adapter successfully', () => {
    const fakeAdapter: SiteAdapter = {
      id: 'fake',
      version: '1.0.0',
      supports: (url) => url.includes('fake.com'),
      navigate: async () => {},
      establishNumericState: async () => {},
      observeState: async () => ({} as any)
    };

    AdapterRegistry.register(fakeAdapter);
    
    const resolved = AdapterRegistry.resolve('http://fake.com/test');
    expect(resolved).toBe(fakeAdapter);
  });

  it('throws an error if no adapter supports the URL', () => {
    expect(() => AdapterRegistry.resolve('http://unsupported.com')).toThrow(/No registered SiteAdapter supports the URL/);
  });

  it('prevents registering duplicate adapters', () => {
    const fakeAdapter: SiteAdapter = {
      id: 'fake',
      version: '1.0.0',
      supports: (url) => url.includes('fake.com'),
      navigate: async () => {},
      establishNumericState: async () => {},
      observeState: async () => ({} as any)
    };

    AdapterRegistry.register(fakeAdapter);
    expect(() => AdapterRegistry.register(fakeAdapter)).toThrow(/is already registered/);
  });
});
