/** @jest-environment jsdom */
const React = require('react')
const { render, screen, fireEvent } = require('@testing-library/react')
require('@testing-library/jest-dom')

const WorkerCard = require('../src/components/WorkerCard').default

test('WorkerCard renders worker info and dispatches events on Message click', () => {
  const worker = {
    _id: 'abcd1234',
    name: 'Demo User',
    email: 'demo@site.test',
    skills: 'Testing, Coding',
    distanceKm: 12.4,
    timeJoined: new Date('2025-01-01T12:00:00Z').toISOString()
  }

  const messageHandler = jest.fn()
  const navHandler = jest.fn()
  window.addEventListener('message-to', messageHandler)
  window.addEventListener('navigate-dashboard', navHandler)

  render(React.createElement(WorkerCard, { worker }))

  expect(screen.getByText('Demo User')).toBeInTheDocument()
  expect(screen.getByText('demo@site.test')).toBeInTheDocument()
  expect(screen.getByText('Testing, Coding')).toBeInTheDocument()
  expect(screen.getByText(/Distance:/)).toHaveTextContent('Distance: 12 km')
  expect(screen.getByText(/Joined:/)).toBeInTheDocument()

  const btn = screen.getByText('Message')
  fireEvent.click(btn)

  expect(messageHandler).toHaveBeenCalled()
  expect(navHandler).toHaveBeenCalled()

  window.removeEventListener('message-to', messageHandler)
  window.removeEventListener('navigate-dashboard', navHandler)
})
