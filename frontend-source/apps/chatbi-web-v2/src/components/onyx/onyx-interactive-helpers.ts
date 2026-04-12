import type React from 'react'

export function guardPortalClick<E extends React.MouseEvent>(
  onClick: ((event: E) => void) | undefined
): ((event: E) => void) | undefined {
  if (!onClick) {
    return undefined
  }

  return (event: E) => {
    if (
      event.currentTarget instanceof Node &&
      event.target instanceof Node &&
      event.currentTarget.contains(event.target)
    ) {
      onClick(event)
    }
  }
}
