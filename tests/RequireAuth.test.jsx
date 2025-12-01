/**
 * Unit tests for RequireAuth component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the AuthContext
const mockUseAuth = jest.fn();
jest.mock('../src/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

// Import after mocking
import RequireAuth from '../src/components/RequireAuth';

describe('RequireAuth', () => {
  const mockDispatchEvent = jest.fn();
  window.dispatchEvent = mockDispatchEvent;

  beforeEach(() => {
    mockDispatchEvent.mockClear();
    mockUseAuth.mockClear();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: 'testUser' });
    
    render(
      <RequireAuth target="dashboard">
        <div data-testid="protected">Protected Content</div>
      </RequireAuth>
    );
    
    expect(screen.getByTestId('protected')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders nothing when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null });
    
    const { container } = render(
      <RequireAuth target="dashboard">
        <div data-testid="protected">Protected Content</div>
      </RequireAuth>
    );
    
    expect(container.innerHTML).toBe('');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('dispatches request-auth event when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null });
    
    render(
      <RequireAuth target="dashboard">
        <div>Protected Content</div>
      </RequireAuth>
    );
    
    expect(mockDispatchEvent).toHaveBeenCalled();
    const event = mockDispatchEvent.mock.calls[0][0];
    expect(event.type).toBe('request-auth');
    expect(event.detail.target).toBe('dashboard');
  });

  it('uses default target when not specified', () => {
    mockUseAuth.mockReturnValue({ user: null });
    
    render(
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );
    
    expect(mockDispatchEvent).toHaveBeenCalled();
  });
});
