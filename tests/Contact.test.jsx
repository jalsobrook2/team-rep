/** @jest-environment jsdom */

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')

const Contact = require('../src/pages/Contact').default

test('Contact page shows mailto link', () => {
  render(React.createElement(Contact))
  const link = screen.getByRole('link', { name: /hello@example.test/i })
  expect(link).toBeInTheDocument()
  expect(link).toHaveAttribute('href', 'mailto:hello@example.test')
})
