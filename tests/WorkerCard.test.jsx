/**
 * Unit tests for WorkerCard component
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WorkerCard from '../src/components/WorkerCard';

// Mock the window.dispatchEvent
const mockDispatchEvent = jest.fn();
window.dispatchEvent = mockDispatchEvent;

describe('WorkerCard', () => {
  const mockWorker = {
    _id: '123abc',
    name: 'John Doe',
    email: 'john@example.com',
    skills: 'JavaScript, React, Node.js'
  };

  beforeEach(() => {
    mockDispatchEvent.mockClear();
  });

  it('renders worker information correctly', () => {
    render(<WorkerCard worker={mockWorker} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('JavaScript, React, Node.js')).toBeInTheDocument();
  });

  it('renders avatar with initials from name', () => {
    render(<WorkerCard worker={mockWorker} />);
    
    // WorkerCard generates initials from first letters of each word in name
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders Message button', () => {
    render(<WorkerCard worker={mockWorker} />);
    
    const messageButton = screen.getByText('Message');
    expect(messageButton).toBeInTheDocument();
  });

  it('dispatches message-to event when Message button is clicked', () => {
    render(<WorkerCard worker={mockWorker} />);
    
    const messageButton = screen.getByText('Message');
    fireEvent.click(messageButton);
    
    expect(mockDispatchEvent).toHaveBeenCalled();
    const event = mockDispatchEvent.mock.calls[0][0];
    expect(event.type).toBe('message-to');
    expect(event.detail.id).toBe('123abc');
  });

  it('handles worker without skills gracefully', () => {
    const workerNoSkills = { ...mockWorker, skills: undefined };
    render(<WorkerCard worker={workerNoSkills} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('handles worker with empty name', () => {
    const workerEmptyName = { ...mockWorker, name: '' };
    render(<WorkerCard worker={workerEmptyName} />);
    
    // Should still render the card structure
    expect(screen.getByText('Message')).toBeInTheDocument();
  });
});
