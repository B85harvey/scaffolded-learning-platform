import { describe, it, expect } from 'vitest'
import { formatApa7Citation } from './formatApa7Citation'
import type { ApaFields } from './formatApa7Citation'

function fields(overrides: Partial<ApaFields> = {}): ApaFields {
  return {
    type: 'website',
    authors: '',
    year: '',
    title: '',
    source: '',
    url: '',
    volume: '',
    issue: '',
    pages: '',
    ...overrides,
  }
}

describe('formatApa7Citation', () => {
  it('Website type with all fields produces correct format', () => {
    const result = formatApa7Citation(
      fields({
        type: 'website',
        authors: 'Smith, J.',
        year: '2023',
        title: 'How to cook custard',
        source: 'Cooking Today',
        url: 'https://cookingtoday.com/custard',
      })
    )
    expect(result).toBe(
      'Smith, J. (2023). How to cook custard. Cooking Today. https://cookingtoday.com/custard'
    )
  })

  it('Book type produces correct format', () => {
    const result = formatApa7Citation(
      fields({
        type: 'book',
        authors: 'Jones, A., & Brown, B.',
        year: '2019',
        title: 'Food Science Fundamentals',
        source: 'Academic Press',
      })
    )
    expect(result).toBe('Jones, A., & Brown, B. (2019). Food Science Fundamentals. Academic Press.')
  })

  it('Journal type produces correct format', () => {
    const result = formatApa7Citation(
      fields({
        type: 'journal',
        authors: 'Lee, C.',
        year: '2021',
        title: 'Trends in food technology',
        source: 'Journal of Food Science',
        volume: '45',
        issue: '3',
        pages: '112–118',
      })
    )
    expect(result).toBe(
      'Lee, C. (2021). Trends in food technology. Journal of Food Science, 45(3), 112–118.'
    )
  })

  it('Other type produces correct format', () => {
    const result = formatApa7Citation(
      fields({
        type: 'other',
        authors: 'Department of Health',
        year: '2020',
        title: 'Australian Dietary Guidelines',
        source: 'Australian Government',
      })
    )
    expect(result).toBe(
      'Department of Health (2020). Australian Dietary Guidelines. Australian Government.'
    )
  })

  it('Missing author starts with title', () => {
    const result = formatApa7Citation(
      fields({
        type: 'website',
        authors: '',
        year: '2022',
        title: 'Food safety at home',
        source: 'Food Standards Australia',
        url: 'https://foodstandards.gov.au',
      })
    )
    expect(result).toBe(
      'Food safety at home (2022). Food Standards Australia. https://foodstandards.gov.au'
    )
  })

  it('Missing year uses (n.d.)', () => {
    const result = formatApa7Citation(
      fields({
        type: 'book',
        authors: 'Taylor, R.',
        year: '',
        title: 'Nutrition Essentials',
        source: 'Health Publishing',
      })
    )
    expect(result).toBe('Taylor, R. (n.d.). Nutrition Essentials. Health Publishing.')
  })

  it('Empty fields are handled gracefully and returns empty string', () => {
    const result = formatApa7Citation(fields())
    expect(result).toBe('')
  })
})
