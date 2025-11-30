/** @jest-environment jsdom */

const React = require('react')
const { render, screen, fireEvent, waitFor } = require('@testing-library/react')
require('@testing-library/jest-dom')

const mockToast = jest.fn()
jest.mock('../src/components/UiProvider', () => ({ useToast: () => mockToast }))

jest.mock('../src/AuthContext', () => ({
  useAuth: () => ({
    authFetch: jest.fn(() => Promise.resolve({ ok: true, json: async () => ({ success: true }) })),
  })
}))

const Register = require('../src/pages/Register').default

test('Register form submits and calls toast on success', async () => {
  render(React.createElement(Register))

  fireEvent.change(screen.getByTestId('register-name'), { target: { value: 'Test User' } })
  fireEvent.change(screen.getByTestId('register-email'), { target: { value: 't@test.test' } })
  fireEvent.change(screen.getByTestId('register-password'), { target: { value: 'pass123' } })
  fireEvent.change(screen.getByTestId('register-skills'), { target: { value: 'plumbing' } })

  fireEvent.click(screen.getByTestId('register-submit'))
  await waitFor(() => expect(mockToast).toHaveBeenCalled())
})
