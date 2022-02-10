import { useState } from 'react'
import { useParams } from 'react-router-dom'
import PropTypes from 'prop-types'

import Breadcrumb from 'ui/Breadcrumb'
import Progress from 'ui/Progress'
import Change from 'ui/Change'
import AppLink from 'shared/AppLink'
import { useCoverageWithFlags } from 'services/file/hooks'

import CodeRenderer from './CodeRenderer'
import Title, { TitleFlags, TitleCoverage } from './Title'
import { LINE_STATE, LINE_TYPE } from './lineStates'

function useCoverageData({ coverage, totals, selectedFlags }) {
  const coverageForAllFlags = selectedFlags.length === 0
  const { owner, repo, provider, ref, ...path } = useParams()
  const queryPerFlag = useCoverageWithFlags(
    {
      provider,
      owner,
      repo,
      ref,
      path: path[0],
      flags: selectedFlags,
    },
    {
      // only run the query if we are filtering per flag
      enabled: !coverageForAllFlags,
      suspense: false,
    }
  )

  if (coverageForAllFlags) {
    // no flag selected, we can return the default coverage
    return { coverage, totals, isLoading: false }
  }

  return {
    coverage: queryPerFlag.data?.coverage ?? {},
    totals: queryPerFlag.data?.totals ?? 0,
    isLoading: queryPerFlag.isLoading,
  }
}

function FileViewer({
  treePaths,
  content,
  coverage,
  totals,
  title,
  change,
  flagNames = [],
  fileName,
}) {
  const [selectedFlags, setSelectedFlags] = useState([])
  const [covered, setCovered] = useState(true)
  const [uncovered, setUncovered] = useState(true)
  const [partial, setPartial] = useState(true)

  const {
    isLoading: coverageIsLoading,
    totals: coverageTotals,
    coverage: coverageData,
  } = useCoverageData({ coverage, totals, selectedFlags })

  return (
    <div className="flex flex-col gap-4">
      <Title
        title={title}
        Flags={() => (
          <TitleFlags
            list={flagNames}
            current={selectedFlags}
            onChange={setSelectedFlags}
            flagsIsLoading={coverageIsLoading}
          />
        )}
      >
        <TitleCoverage
          onChange={() => setCovered((covered) => !covered)}
          checked={covered}
          coverage={LINE_STATE.COVERED}
        />
        <TitleCoverage
          onChange={() => setPartial((partial) => !partial)}
          checked={partial}
          coverage={LINE_STATE.PARTIAL}
        />
        <TitleCoverage
          onChange={() => setUncovered((uncovered) => !uncovered)}
          checked={uncovered}
          coverage={LINE_STATE.UNCOVERED}
        />
      </Title>

      <div>
        <div
          className={`
            flex flex-row flex-wrap items-start justify-between gap-2 sm:items-center
            bg-ds-gray-primary
            border-t p-3 border-r border-l border-solid border-ds-gray-tertiary 
          `}
        >
          <div className="flex-1">
            <Breadcrumb paths={[...treePaths]} />
          </div>
          <div className="max-w-xs sm:flex-1 flex gap-2 justify-end items-center">
            <Progress amount={coverageTotals} label={true}/>
            <Change value={change} variant="fileViewer"/>
          </div>
        </div>
        {content ? (
          <CodeRenderer
            showCovered={covered}
            showUncovered={uncovered}
            coverage={coverageData}
            showPartial={partial}
            code={content}
            fileName={fileName}
          />
        ) : (
          <div className="border-solid border-ds-gray-tertiary border p-4">
            <p>
              There was a problem getting the source code from your provider.
              Unable to show line by line coverage.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

FileViewer.propTypes = {
  content: PropTypes.string,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
  coverage: PropTypes.objectOf(
    PropTypes.oneOf([LINE_TYPE.HIT, LINE_TYPE.MISS, LINE_TYPE.PARTIAL])
  ).isRequired,
  totals: PropTypes.number,
  treePaths: PropTypes.arrayOf(PropTypes.shape(AppLink.propTypes)).isRequired,
  change: PropTypes.number,
  flagNames: PropTypes.arrayOf(PropTypes.string),
  fileName: PropTypes.string.isRequired,
}

export default FileViewer
