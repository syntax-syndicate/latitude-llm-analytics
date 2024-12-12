import { useDocumentParameters } from '$/hooks/useDocumentParameters'

import { Props } from '../index'
import { InputParams } from '../Input'

export function ManualParams({
  document,
  commitVersionUuid,
  prompt,
  setPrompt,
}: Props) {
  const {
    manual: { inputs, setInput },
  } = useDocumentParameters({
    documentVersionUuid: document.documentUuid,
    commitVersionUuid,
  })
  return (
    <InputParams
      source='manual'
      inputs={inputs}
      setInput={setInput}
      prompt={prompt}
      setPrompt={setPrompt}
    />
  )
}
