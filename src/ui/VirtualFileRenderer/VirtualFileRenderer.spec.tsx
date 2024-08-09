import * as Sentry from '@sentry/react'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
// eslint-disable-next-line no-restricted-imports
import { type Dictionary } from 'lodash'
import { MemoryRouter, Route, useLocation } from 'react-router-dom'

import { VirtualFileRenderer } from './VirtualFileRenderer'

jest.mock('@sentry/react', () => {
  const originalModule = jest.requireActual('@sentry/react')
  return {
    ...originalModule,
    captureMessage: jest.fn(),
  }
})

window.requestAnimationFrame = (cb) => {
  cb(1)
  return 1
}
window.cancelAnimationFrame = () => {}

const scrollToMock = jest.fn()
window.scrollTo = scrollToMock

class ResizeObserverMock {
  callback = (x: any) => null

  constructor(callback: any) {
    this.callback = callback
  }

  observe() {
    this.callback([
      {
        contentRect: { width: 100 },
        target: {
          getAttribute: () => ({ scrollWidth: 100 }),
        },
      },
    ])
  }
  unobserve() {
    // do nothing
  }
  disconnect() {
    // do nothing
  }
}
global.window.ResizeObserver = ResizeObserverMock

const code = `<Breadcrumb
    paths={[
    { pageName: 'owner', text: owner },
    { pageName: 'repo', text: repo },
    ...treePaths,
    {..props}
    ]}
/>`

const coverageData = {
  0: 'H',
  1: 'M',
  2: 'P',
} as unknown as Dictionary<'H' | 'M' | 'P'>

let testLocation: ReturnType<typeof useLocation>
const wrapper =
  (initialEntry = '/'): React.FC<React.PropsWithChildren> =>
  ({ children }) => (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Route path="/">{children}</Route>
      <Route
        path="*"
        render={({ location }) => {
          testLocation = location
          return null
        }}
      />
    </MemoryRouter>
  )

describe('VirtualFileRenderer', () => {
  function setup() {
    const user = userEvent.setup()

    return { user }
  }

  it('renders the text-area', () => {
    render(
      <VirtualFileRenderer
        code={code}
        coverage={coverageData}
        fileName="tsx"
      />,
      {
        wrapper: wrapper(),
      }
    )

    const textArea = screen.getByTestId('virtual-file-renderer')
    expect(textArea).toBeInTheDocument()

    const codeBlock = within(textArea).getByText(/<Breadcrumb/)
    expect(codeBlock).toBeInTheDocument()
  })

  describe('virtualized list', () => {
    describe('valid language', () => {
      it('renders code in virtualized list', () => {
        render(
          <VirtualFileRenderer
            code={code}
            coverage={coverageData}
            fileName="tsx"
          />,
          {
            wrapper: wrapper(),
          }
        )

        const virtualOverlay = screen.getByTestId(
          'virtual-file-renderer-overlay'
        )
        expect(virtualOverlay).toBeInTheDocument()

        const codeBlock = within(virtualOverlay).getByText(/Breadcrumb/)
        expect(codeBlock).toBeInTheDocument()
      })
    })

    describe('invalid language', () => {
      it('renders code in virtualized list', () => {
        render(
          <VirtualFileRenderer
            code={code}
            coverage={coverageData}
            fileName="random-file-type"
          />,
          {
            wrapper: wrapper(),
          }
        )

        const virtualOverlay = screen.getByTestId(
          'virtual-file-renderer-overlay'
        )
        expect(virtualOverlay).toBeInTheDocument()

        const codeBlock = within(virtualOverlay).getByText(/Breadcrumb/)
        expect(codeBlock).toBeInTheDocument()
      })
    })
  })

  it('renders line numbers', () => {
    render(
      <VirtualFileRenderer
        code={code}
        coverage={coverageData}
        fileName="tsx"
      />,
      {
        wrapper: wrapper(),
      }
    )

    const lineNumbers = screen.getAllByText(/\d+/)
    expect(lineNumbers).toHaveLength(8)
  })

  describe('covered lines', () => {
    it('applies coverage background', () => {
      render(
        <VirtualFileRenderer
          code={code}
          coverage={coverageData}
          fileName="tsx"
        />,
        {
          wrapper: wrapper(),
        }
      )

      const virtualOverlay = screen.getByTestId('virtual-file-renderer-overlay')
      expect(virtualOverlay).toBeInTheDocument()

      // We're testing like this so our tests are more resilient to changes in the code
      // eslint-disable-next-line testing-library/no-node-access
      const coveredLine = virtualOverlay.querySelector(
        '.bg-ds-coverage-covered'
      )
      expect(coveredLine).toHaveClass('bg-ds-coverage-covered')
    })
  })

  describe('uncovered lines', () => {
    it('applies missing coverage background', () => {
      render(
        <VirtualFileRenderer
          code={code}
          coverage={coverageData}
          fileName="tsx"
        />,
        {
          wrapper: wrapper(),
        }
      )

      const virtualOverlay = screen.getByTestId('virtual-file-renderer-overlay')
      expect(virtualOverlay).toBeInTheDocument()

      // We're testing like this so our tests are more resilient to changes in the code
      // eslint-disable-next-line testing-library/no-node-access
      const uncovered = virtualOverlay.querySelector(
        '.bg-ds-coverage-uncovered'
      )
      expect(uncovered).toHaveClass('bg-ds-coverage-uncovered')
    })
  })

  describe('partial lines', () => {
    it('applies partial coverage background', () => {
      render(
        <VirtualFileRenderer
          code={code}
          coverage={coverageData}
          fileName="tsx"
        />,
        {
          wrapper: wrapper(),
        }
      )

      const virtualOverlay = screen.getByTestId('virtual-file-renderer-overlay')
      expect(virtualOverlay).toBeInTheDocument()

      // We're testing like this so our tests are more resilient to changes in the code
      // eslint-disable-next-line testing-library/no-node-access
      const partial = virtualOverlay.querySelector('.bg-ds-coverage-partial')
      expect(partial).toHaveClass('bg-ds-coverage-partial')
    })
  })

  describe('toggling pointer events', () => {
    let requestAnimationFrameSpy: jest.SpyInstance
    let cancelAnimationFrameSpy: jest.SpyInstance
    let dateNowSpy: jest.SpyInstance

    beforeEach(() => {
      requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame')
      cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame')
      dateNowSpy = jest.spyOn(Date, 'now')
    })

    afterEach(() => {
      requestAnimationFrameSpy.mockRestore()
      cancelAnimationFrameSpy.mockRestore()
      dateNowSpy.mockRestore()
      jest.clearAllMocks()
    })

    it('disables pointer events on scroll and resets after timeout', async () => {
      dateNowSpy
        .mockImplementationOnce(() => 1000)
        .mockImplementationOnce(() => 2000)
      requestAnimationFrameSpy.mockImplementation((cb) => {
        setTimeout(() => {
          cb()
        }, 50)
        return 1
      })

      render(
        <VirtualFileRenderer
          code={code}
          coverage={coverageData}
          fileName="tsx"
        />,
        {
          wrapper: wrapper(),
        }
      )

      const lines = await screen.findAllByText(
        /{ pageName: 'repo', text: repo },/
      )
      expect(lines[0]).toBeInTheDocument()

      await fireEvent.scroll(window, { target: { scrollX: 100 } })

      const codeRenderer = screen.getByTestId('virtual-file-renderer')
      await waitFor(() =>
        expect(codeRenderer).toHaveStyle('pointer-events: none')
      )
      await waitFor(() =>
        expect(codeRenderer).toHaveStyle('pointer-events: auto')
      )
    })

    it('calls cancelAnimationFrame', async () => {
      dateNowSpy
        .mockImplementationOnce(() => 1000)
        .mockImplementationOnce(() => 2000)
      requestAnimationFrameSpy.mockImplementation((cb) => {
        setTimeout(() => {
          cb()
        }, 50)
        return 1
      })

      const { container } = render(
        <VirtualFileRenderer
          code={code}
          coverage={coverageData}
          fileName="tsx"
        />,
        {
          wrapper: wrapper(),
        }
      )

      const lines = await screen.findAllByText(
        /{ pageName: 'repo', text: repo },/
      )
      expect(lines[0]).toBeInTheDocument()

      await fireEvent.scroll(window, { target: { scrollX: 100 } })

      // eslint-disable-next-line testing-library/no-container
      container.remove()
      await fireEvent.scroll(window, { target: { scrollX: 100 } })
      await fireEvent.scroll(window, { target: { scrollX: 100 } })

      await waitFor(() => expect(cancelAnimationFrameSpy).toHaveBeenCalled())
    })
  })

  describe('highlighted line', () => {
    describe('user clicks on line number', () => {
      it('updates the URL', async () => {
        const { user } = setup()
        render(
          <VirtualFileRenderer
            code={code}
            coverage={coverageData}
            fileName="tsx"
          />,
          {
            wrapper: wrapper(),
          }
        )

        const line = screen.getByText(1)
        await user.click(line)

        await waitFor(() => expect(testLocation.hash).toBe('#L1'))
      })

      it('highlights the line on click', async () => {
        const { user } = setup()
        render(
          <VirtualFileRenderer
            code={code}
            coverage={coverageData}
            fileName="tsx"
          />,
          {
            wrapper: wrapper(),
          }
        )

        const line = screen.getByText(1)
        await user.click(line)

        const bar = await screen.findByTestId('highlighted-bar')
        expect(bar).toBeInTheDocument()
        await waitFor(() => expect(bar).toHaveClass('bg-ds-blue-medium'))
      })

      it('removes highlighting when clicking on highlighted line', async () => {
        const { user } = setup()
        render(
          <VirtualFileRenderer
            code={code}
            coverage={coverageData}
            fileName="tsx"
          />,
          {
            wrapper: wrapper(),
          }
        )

        const line = screen.getByText(1)
        await user.click(line)
        await waitFor(() => expect(testLocation.hash).toBe('#L1'))
        await user.click(line)
        await waitFor(() => expect(testLocation.hash).toBe(''))
      })
    })
  })

  describe('scroll to line', () => {
    describe('valid line number', () => {
      it('calls scrollTo', async () => {
        render(
          <VirtualFileRenderer
            code={code}
            coverage={coverageData}
            fileName="tsx"
          />,
          { wrapper: wrapper('/#L4') }
        )

        await waitFor(() => expect(scrollToMock).toHaveBeenCalled())
      })
    })

    describe('invalid line number', () => {
      it('captures message to sentry', async () => {
        render(
          <VirtualFileRenderer
            code={code}
            coverage={coverageData}
            fileName="tsx"
          />,
          { wrapper: wrapper('/#RandomNumber') }
        )

        await waitFor(() => {
          expect(Sentry.captureMessage).toHaveBeenCalledWith(
            'Invalid line number in file renderer hash: #RandomNumber',
            { fingerprint: ['file-renderer-invalid-line-number'] }
          )
        })
      })
    })
  })

  describe('horizontal scroll', () => {
    it('syncs code display with text area scroll', async () => {
      render(
        <VirtualFileRenderer
          code={code}
          coverage={coverageData}
          fileName="tsx"
        />,
        {
          wrapper: wrapper(),
        }
      )

      const textArea = screen.getByTestId('virtual-file-renderer-text-area')
      await fireEvent.scroll(textArea, {
        target: { scrollLeft: 100 },
      })

      const virtualOverlay = screen.getByTestId('virtual-file-renderer-overlay')
      await waitFor(() => expect(virtualOverlay.scrollLeft).toBe(100))
    })
  })
})
