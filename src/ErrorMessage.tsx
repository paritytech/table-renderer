import { styled } from "@linaria/react"
import React from "react"

const closeErrorFontSize = "1rem"
const errorRowPadding = "8px"

const ErrorContainer = styled.div`
  position: relative;
`

const ErrorRow = styled.p`
  background-color: rgba(255, 0, 0, 0.1);
  border: 1px solid red;
  margin: 1rem 0;
  padding: calc(${closeErrorFontSize} + ${errorRowPadding}) ${errorRowPadding}
    ${errorRowPadding} ${errorRowPadding};
`

const CloseErrorButton = styled.button`
  border: none;
  background-color: none;
  position: absolute;
  font-size: ${closeErrorFontSize};
  right: 0;
  top: 0;
`

const ErrorMessage = React.forwardRef<
  HTMLDivElement,
  {
    error: string | null | undefined
    dismiss: (() => void) | null
  }
>(function ({ error, dismiss }, ref) {
  if (!error) {
    return null
  }
  return (
    <ErrorContainer {...{ ref }}>
      <ErrorRow>{error}</ErrorRow>
      <CloseErrorButton onClick={dismiss ?? undefined}>
        Dismiss
      </CloseErrorButton>
    </ErrorContainer>
  )
})

export default ErrorMessage
