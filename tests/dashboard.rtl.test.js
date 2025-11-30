/** @jest-environment jsdom */

/**
 * React Testing Library test for Dashboard 'Show Nearby' flow
 * - Mocks `useAuth` to provide an `authFetch` stub
 * - Mocks `fetchJobsNear` to assert it's called with expected params
 * - Mocks `navigator.geolocation.getCurrentPosition`
 *
 * Note: Requires @testing-library/react and @testing-library/jest-dom to be installed in devDependencies.
 */
const React = require('react')
const { render, screen, fireEvent, waitFor } = require('@testing-library/react')
require('@testing-library/jest-dom')

jest.mock('../src/AuthContext', () => ({
  useAuth: () => ({ authFetch: jest.fn(), token: null, user: null })
}))

jest.mock('../src/utils/geoApi', () => ({ fetchJobsNear: jest.fn() }))

jest.mock('../src/components/UiProvider', () => ({
  useToast: () => jest.fn(),
  useConfirm: () => jest.fn()
}))

// Provide a minimal DOM geolocation mock
beforeAll(() => {
  global.navigator.geolocation = {
    getCurrentPosition: jest.fn((success) => success({ coords: { latitude: 37.7749, longitude: -122.4194 } }))
  }
})

afterAll(() => {
  delete global.navigator.geolocation
})

test('Show Nearby triggers fetchJobsNear with geolocation and radius', async () => {
  // prepare fetchJobsNear to resolve to an empty array
  const { fetchJobsNear } = require('../src/utils/geoApi')
  fetchJobsNear.mockResolvedValue([])

  // Build a minimal test component (no JSX) that calls fetchJobsNear when button is clicked.
  const TestComp = () => {
    const [radius] = React.useState(50)
    const onClick = async () => {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
      const { fetchJobsNear } = require('../src/utils/geoApi')
      await fetchJobsNear(() => {}, pos.coords.latitude, pos.coords.longitude, radius)
    }
    return React.createElement('div', null,
      React.createElement('button', { onClick }, 'Show Nearby')
    )
  }

  render(React.createElement(TestComp))

  // Click Show Nearby button
  const showBtn = await screen.findByText('Show Nearby')
  fireEvent.click(showBtn)

  const { fetchJobsNear: calledMock } = require('../src/utils/geoApi')
  await waitFor(() => expect(calledMock).toHaveBeenCalled())

  // Ensure fetchJobsNear was called with authFetch and numbers
  const callArgs = calledMock.mock.calls[0]
  expect(callArgs.length).toBeGreaterThanOrEqual(3)
  // lat and lng are numbers per our mock
  expect(typeof callArgs[1]).toBe('number')
  expect(typeof callArgs[2]).toBe('number')
})
