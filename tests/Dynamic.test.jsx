/** @jest-environment jsdom */

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')

const Dynamic = require('../src/pages/Dynamic').default

test('Dynamic page renders heading and demo text', () => {
  render(React.createElement(Dynamic))
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Dynamic Page')
  expect(screen.getByText(/Replace with any dynamic content/i)).toBeInTheDocument()
})
