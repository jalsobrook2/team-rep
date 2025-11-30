/** @jest-environment jsdom */

const React = require('react')
const { render, screen } = require('@testing-library/react')
require('@testing-library/jest-dom')

const About = require('../src/pages/About').default

test('About page renders heading and quick tips', () => {
  render(React.createElement(About))
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('About')
  expect(screen.getByText(/Pocket Jobs is a lightweight marketplace/i)).toBeInTheDocument()
  expect(screen.getByText(/Quick tips/i)).toBeInTheDocument()
})
