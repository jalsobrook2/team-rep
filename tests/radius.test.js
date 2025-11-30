const { clampRadius, DEFAULT_RADIUS, MIN_RADIUS, MAX_RADIUS } = require('../src/utils/radius')

describe('radius util', () => {
  test('default values exported', () => {
    expect(DEFAULT_RADIUS).toBe(50)
    expect(MIN_RADIUS).toBeGreaterThanOrEqual(1)
    expect(MAX_RADIUS).toBeGreaterThanOrEqual(MIN_RADIUS)
  })

  test('clampRadius returns min for values below min', () => {
    expect(clampRadius(0)).toBe(MIN_RADIUS)
    expect(clampRadius(-10)).toBe(MIN_RADIUS)
  })

  test('clampRadius returns max for values above max', () => {
    expect(clampRadius(10000)).toBe(MAX_RADIUS)
    expect(clampRadius(501)).toBe(MAX_RADIUS)
  })

  test('clampRadius rounds numeric inputs', () => {
    expect(clampRadius(12.7)).toBe(13)
    expect(clampRadius('42.3')).toBe(42)
  })

  test('clampRadius handles invalid input by returning default', () => {
    expect(clampRadius(undefined)).toBe(DEFAULT_RADIUS)
    expect(clampRadius(null)).toBe(DEFAULT_RADIUS)
    expect(clampRadius('not-a-number')).toBe(DEFAULT_RADIUS)
  })
})
