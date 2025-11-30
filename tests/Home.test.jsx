/** @jest-environment jsdom */

const React = require('react')
const { render, screen, fireEvent } = require('@testing-library/react')
require('@testing-library/jest-dom')

const Home = require('../src/pages/Home').default

test('Home shows branding and buttons; login button calls handler', () => {
  const mockLogin = jest.fn()
  render(React.createElement(Home, { onLoginClick: mockLogin }))
  expect(screen.getByText('Pocket Jobs')).toBeInTheDocument()
  const loginBtn = screen.getByText(/Login \/ Register/i)
  const exploreBtn = screen.getByText(/Explore \(no login\)/i)
  expect(loginBtn).toBeInTheDocument()
  expect(exploreBtn).toBeInTheDocument()

  fireEvent.click(loginBtn)
  expect(mockLogin).toHaveBeenCalledWith('auth')
})
