import { useEffect } from 'react'
import { useNavigationStore } from '../stores/useNavigationStore'
import { scrollToContentMatch } from '../../shared/scrollContainer'

/**
 * 内容搜索命中后，打开文件并滚动到匹配行
 */
export function useContentJump(activeFile: string | null, content: string | undefined) {
  const pendingContentJump = useNavigationStore((s) => s.pendingContentJump)
  const setPendingContentJump = useNavigationStore((s) => s.setPendingContentJump)

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
