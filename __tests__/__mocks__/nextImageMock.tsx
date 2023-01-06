/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import type { ImgHTMLAttributes } from 'react'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'onLoad'> & {
  layout?: string
  objectFit?: string
  priority?: boolean
  onLoadingComplete?: () => void
}

/**
 * `next/image` resolves its optimiser configuration from the Next runtime,
 * which Jest does not provide. This stub keeps the same props contract —
 * including firing `onLoadingComplete` when the underlying <img> loads — and
 * renders a real element, so component tests assert on the DOM users get.
 */
const NextImageMock = ({ layout, objectFit, priority, onLoadingComplete, ...rest }: Props) => (
  <img
    {...rest}
    data-layout={layout}
    data-object-fit={objectFit}
    data-priority={priority ? 'true' : undefined}
    onLoad={() => onLoadingComplete?.()}
  />
)

export default NextImageMock
