/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes } from 'react'

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean
  priority?: boolean
}

/**
 * `next/image` resolves its optimiser configuration from the Next runtime,
 * which Jest does not provide. This stub keeps the props contract the
 * components use and renders a real element, so component tests assert on
 * the DOM users get.
 */
const NextImageMock = ({ fill, priority, ...rest }: Props) => (
  <img
    {...rest}
    data-fill={fill ? 'true' : undefined}
    data-priority={priority ? 'true' : undefined}
  />
)

export default NextImageMock
