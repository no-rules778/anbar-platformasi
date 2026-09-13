import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ItemStatePanel } from './ItemStatePanel'
import { DraftLinesPanel } from './DraftLinesPanel'

/* M18-51 / M18-52 — the two right-column card headings.

   Both panels carried a React PARAPHRASE of the legacy wording («Mal üzrə
   vəziyyət» for «Seçilmiş malın vəziyyəti», «Sənəd sətirləri» for «Sənədin
   sətirləri»), and both put their title outside a `<header>`. The platform
   styles a card title through `.card>header` (index.css:68) — padding plus a
   bottom border — so a bare `<h3>` child of `.card` matched no rule and
   rendered unpadded, with no separator from the card body.

   These are rendered assertions rather than source-text ones: the heading is
   real DOM, so a render test can see it. The stylesheet side of the same
   correction is pinned in index.css.operation.test.ts. */

const noop = () => {}

describe('ItemStatePanel — «Seçilmiş malın vəziyyəti» (M18-51)', () => {
  it('uses the legacy heading, inside the card header', () => {
    const { container } = render(<ItemStatePanel code={null} bal={[]} />)
    const header = container.querySelector('.card > header')
    expect(header).not.toBeNull()
    expect(header?.querySelector('h3')?.textContent).toBe('Seçilmiş malın vəziyyəti')
  })

  it('does not render the earlier paraphrase', () => {
    render(<ItemStatePanel code={null} bal={[]} />)
    expect(screen.queryByText('Mal üzrə vəziyyət')).toBeNull()
  })
})

describe('DraftLinesPanel — «Sənədin sətirləri» (M18-52)', () => {
  function renderPanel() {
    return render(
      <DraftLinesPanel
        lines={[]}
        restoredAt={null}
        onDismissRestoreBanner={noop}
        onRemove={noop}
        onEdit={noop}
        canPost={false}
        editMode={false}
        onPost={noop}
        onClear={noop}
      />,
    )
  }

  it('uses the legacy heading, inside the card header', () => {
    const { container } = renderPanel()
    const header = container.querySelector('.card > header')
    expect(header).not.toBeNull()
    expect(header?.querySelector('h3')?.textContent).toBe('Sənədin sətirləri')
  })

  it('does not render the earlier paraphrase', () => {
    renderPanel()
    expect(screen.queryByText('Sənəd sətirləri')).toBeNull()
  })

  /* The count/total hint is part of the legacy header row (index.html:303,
     `#op-cnt`), so it must stay INSIDE the header, not drift into the body. */
  it('keeps the line-count hint in the header row', () => {
    const { container } = renderPanel()
    expect(container.querySelector('.card > header .hint')).not.toBeNull()
  })
})
