import React, { useRef, useState } from 'react'
import { useClickAway } from 'react-use'
import cs from 'classnames'

import { useNav } from 'services/header'
import { useUser } from 'services/user'
import Icon from 'components/Icon'
import { UserNavA } from './NavLink'

function Dropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef()
  const { user } = useNav()
  const [{ username, avatarUrl }] = useUser()

  useClickAway(dropdownRef, () => setIsOpen(false))

  return (
    <div
      ref={dropdownRef}
      className="ml-3 relative border border-solid border-gray-900"
    >
      <button
        tabIndex="0"
        onClick={() => setIsOpen(!isOpen)}
        className={cs(
          'flex items-center max-w-xs p-2 text-sm rounded-t-3xl',
          'border-r border-l border-t border-solid border-gray-900',
          'bg-gray-800 hover:bg-gray-600 focus:outline-none',
          { 'rounded-b-3xl': !isOpen, 'rounded-b-none': isOpen }
        )}
        id="user-menu"
        aria-haspopup="true"
      >
        <span className="sr-only">Open user menu</span>
        <img
          className="h-8 w-8 rounded-full"
          src={avatarUrl}
          alt="user avatar"
        />
        <p className="mx-2">{username}</p>
        <Icon
          name="rightChevron"
          color="text-white"
          className={cs(
            'w-4 h-4 mr-2',
            'transition-transform duration-75 ease-in-out transform',
            'motion-reduce:transition-none motion-reduce:transform-none',
            {
              '-rotate-90': isOpen,
              'rotate-90': !isOpen,
            }
          )}
        />
      </button>
      <div
        className={cs(
          'origin-top-right absolute right-0',
          'bg-gray-800 w-full rounded-b-3xl',
          'border-r border-l border-b border-solid border-gray-900',
          'divide-y divide-gray-900',
          { hidden: !isOpen }
        )}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="user-menu"
      >
        {user.map((props, i) => (
          <UserNavA
            key={`dropdown-${i}`}
            className={cs('bg-gray-800 hover:bg-gray-600', {
              'border-t border-solid border-gray-900': i === 0,
              'rounded-b-3xl pb-3': i === user.length - 1,
            })}
            {...props}
          />
        ))}
      </div>
    </div>
  )
}

export default Dropdown
