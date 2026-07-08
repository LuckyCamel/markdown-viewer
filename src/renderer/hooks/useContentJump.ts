import { useEffect } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { scrollToContentMatch } from '../../shared/scrollContainer'

/**
 * 内容搜索命中后，打开文件并滚动到匹配行
 */
export function useContentJump(activeFile: string | null, content: string | undefined) {
  const pendingContentJump = useUIStore((s) => s.pendingContentJump)
  const setPendingContentJump = useUIStore((s) => s.setPendingContentJump)

  useEffect(() => {
    if (!pendingContentJump || !activeFile || content === undefined) return
    if (pendingContentJump.path !== activeFile) return

    const frame = requestAnimationFrame(() => {
      scrollToContentMatch(pendingContentJump.line, pendingContentJump.lineContent, content)
      setPendingContentJump(null)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingContentJump, activeFile, content, setPendingContentJump])
}
