/**
 * Unit tests for DemoLogin component
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the AuthContext
const mockDemoLogin = jest.fn();
jest.mock('../src/AuthContext', () => ({
  useAuth: () => ({
    demoLogin: mockDemoLogin
  })
}));

// Import after mocking
import DemoLogin from '../src/components/DemoLogin';

describe('DemoLogin', () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    mockDemoLogin.mockClear();
    mockOnSuccess.mockClear();
  });

  it('renders demo login button', () => {
    render(<DemoLogin onSuccess={mockOnSuccess} />);
    
    const button = screen.getByTestId('demo-login-toggle');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent(/demo login/i);
  });

  it('opens dropdown when button is clicked', () => {
    render(<DemoLogin onSuccess={mockOnSuccess} />);
    
    const button = screen.getByTestId('demo-login-toggle');
    fireEvent.click(button);
    
    // Check for demo account options
    expect(screen.getByText('Demo User')).toBeInTheDocument();
    expect(screen.getByText('Alice Demo')).toBeInTheDocument();
    expect(screen.getByText('Bob Demo')).toBeInTheDocument();
  });

  it('closes dropdown when clicked again', () => {
    render(<DemoLogin onSuccess={mockOnSuccess} />);
    
    const button = screen.getByTestId('demo-login-toggle');
    fireEvent.click(button); // Open
    fireEvent.click(button); // Close
    
    expect(screen.queryByText('Demo User')).not.toBeInTheDocument();
  });

  it('calls demoLogin with correct email when demo account is selected', async () => {
    mockDemoLogin.mockResolvedValue({});
    render(<DemoLogin onSuccess={mockOnSuccess} />);
    
    const button = screen.getByTestId('demo-login-toggle');
    fireEvent.click(button);
    
    const demoUserOption = screen.getByTestId('demo-item-demo@pocketjob.test');
    fireEvent.click(demoUserOption);
    
    await waitFor(() => {
      expect(mockDemoLogin).toHaveBeenCalledWith('demo@pocketjob.test');
    });
  });

  it('calls onSuccess callback after successful login', async () => {
    mockDemoLogin.mockResolvedValue({});
    render(<DemoLogin onSuccess={mockOnSuccess} />);
    
    const button = screen.getByTestId('demo-login-toggle');
    fireEvent.click(button);
    
    const demoUserOption = screen.getByTestId('demo-item-demo@pocketjob.test');
    fireEvent.click(demoUserOption);
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('shows error when login fails', async () => {
    mockDemoLogin.mockRejectedValue(new Error('Login failed'));
    render(<DemoLogin onSuccess={mockOnSuccess} />);
    
    const button = screen.getByTestId('demo-login-toggle');
    fireEvent.click(button);
    
    const demoUserOption = screen.getByTestId('demo-item-demo@pocketjob.test');
    fireEvent.click(demoUserOption);
    
    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('closes dropdown after successful login', async () => {
    mockDemoLogin.mockResolvedValue({});
    render(<DemoLogin onSuccess={mockOnSuccess} />);
    
    const button = screen.getByTestId('demo-login-toggle');
    fireEvent.click(button);
    
    const demoUserOption = screen.getByTestId('demo-item-demo@pocketjob.test');
    fireEvent.click(demoUserOption);
    
    await waitFor(() => {
      expect(screen.queryByText('Alice Demo')).not.toBeInTheDocument();
    });
  });

  it('shows all three demo accounts', () => {
    render(<DemoLogin onSuccess={mockOnSuccess} />);
    
    const button = screen.getByTestId('demo-login-toggle');
    fireEvent.click(button);
    
    expect(screen.getByTestId('demo-item-demo@pocketjob.test')).toBeInTheDocument();
    expect(screen.getByTestId('demo-item-alice@demo.test')).toBeInTheDocument();
    expect(screen.getByTestId('demo-item-bob@demo.test')).toBeInTheDocument();
  });
});
