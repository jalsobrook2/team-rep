/** @jest-environment jsdom */
const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')

jest.mock('../src/AuthContext', () => ({
  useAuth: () => ({ token: null, authFetch: jest.fn(), parseJwt: jest.fn() })
}))

jest.mock('../src/components/UiProvider', () => ({ useToast: () => jest.fn() }))

const Profile = require('../src/pages/Profile').default

test('Profile prompts to sign in when no token present', () => {
  render(React.createElement(Profile))
  expect(screen.getByText('Please sign in to view your profile.')).toBeInTheDocument()
})
