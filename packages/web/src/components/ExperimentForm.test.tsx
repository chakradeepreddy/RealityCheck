/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ExperimentForm } from './ExperimentForm';

describe('ExperimentForm', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders initial state', () => {
    render(<ExperimentForm onSubmit={vi.fn()} isLoading={false} />);
    
    expect(screen.getByLabelText(/Target URL/i)).toBeDefined();
    expect(screen.getByLabelText(/^Claim$/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /RUN REALITYCHECK/i })).toBeDefined();
  });

  it('shows error on invalid URL', () => {
    const onSubmit = vi.fn();
    render(<ExperimentForm onSubmit={onSubmit} isLoading={false} />);
    
    const urlInput = screen.getByLabelText(/Target URL/i);
    const claimInput = screen.getByLabelText(/^Claim$/i);
    
    fireEvent.change(urlInput, { target: { value: 'not-a-url' } });
    fireEvent.change(claimInput, { target: { value: 'Valid claim' } });
    
    fireEvent.submit(screen.getByRole('button', { name: /RUN REALITYCHECK/i }));
    
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Please enter a valid URL/i)).toBeDefined();
  });

  it('calls onSubmit with valid inputs', () => {
    const onSubmit = vi.fn();
    render(<ExperimentForm onSubmit={onSubmit} isLoading={false} />);
    
    const urlInput = screen.getByLabelText(/Target URL/i);
    const claimInput = screen.getByLabelText(/^Claim$/i);
    const modeSelect = screen.getByLabelText(/Execution Mode/i);
    
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.change(claimInput, { target: { value: 'Valid claim' } });
    fireEvent.change(modeSelect, { target: { value: 'AUTHORIZED_LIVE' } });
    
    fireEvent.submit(screen.getByRole('button', { name: /RUN REALITYCHECK/i }));
    
    expect(onSubmit).toHaveBeenCalledWith('https://example.com', 'Valid claim', 'AUTHORIZED_LIVE', undefined);
    expect(screen.queryByText(/Please enter a valid URL/i)).toBeNull();
  });

  it('disables inputs when loading', () => {
    render(<ExperimentForm onSubmit={vi.fn()} isLoading={true} />);
    
    expect((screen.getByLabelText(/Target URL/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(/^Claim$/i) as HTMLTextAreaElement).disabled).toBe(true);
    const submitButton = screen.getAllByRole('button').find(b => (b as HTMLButtonElement).type === 'submit');
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
  });
});
