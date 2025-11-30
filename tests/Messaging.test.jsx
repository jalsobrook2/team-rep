/** @jest-environment jsdom */
const React = require('react')
const { render, screen, waitFor, fireEvent } = require('@testing-library/react')
require('@testing-library/jest-dom')

// Mock AuthContext to provide authFetch and token
jest.mock('../src/AuthContext', () => ({
  useAuth: () => ({
    authFetch: jest.fn((url)=>{
      if(url.startsWith('/api/workers')) return Promise.resolve({ ok:true, status:200, json: async ()=> ({ success:true, data:{ workers: [], page:1, totalPages:1 } }) })
      if(url.startsWith('/api/messages/conversations')) return Promise.resolve({ ok:true, status:200, json: async ()=> ({ success:true, data: [] }) })
      return Promise.resolve({ ok:false, status:404, json: async ()=> ({ error: 'not found' }) })
    }),
    token: null
  })
}))

jest.mock('../src/components/UiProvider', () => ({ useToast: () => jest.fn() }))

const Messaging = require('../src/components/Messaging') || require('../src/Components/Messaging')

beforeAll(() => {
  // provide a minimal geolocation stub that rejects so loadUsers falls back gracefully
  global.navigator.geolocation = { getCurrentPosition: jest.fn((succ, err)=> err && err({ message: 'no geo' })) }
})
afterAll(() => { delete global.navigator.geolocation })

test('Messaging renders and shows empty states when no users or conversations', async () => {
  render(React.createElement(Messaging.default || Messaging))

  // Wait for left pane messages to load and show 'No conversations'
  await waitFor(()=> expect(screen.getByText('No conversations')).toBeInTheDocument())

  // The find pane should show no users
  await waitFor(()=> expect(screen.getByText('No users found')).toBeInTheDocument())

  // typing in message body updates textarea
  const textarea = screen.getByPlaceholderText ? screen.getByPlaceholderText('Write a message') : screen.getByRole('textbox')
  fireEvent.change(textarea, { target: { value: 'Hello' } })
  expect(textarea.value).toBe('Hello')
})
