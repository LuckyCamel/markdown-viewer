import { useEffect } from 'react'
import { useUIStore } from '../stores/useUIStore'
import { scrollToAnchor } from '../../shared/scrollContainer'

/**
 * 内部链接 #anchor 跳转：打开目标文件后滚动到对应标题
 */
export function useAnchorJump(activeFile: string | null, content: string | undefined) {
  const pendingAnchorJump = useUIStore((s) => s.pendingAnchorJump)
  const setPendingAnchorJump = useUIStore((s) => s.setPendingAnchorJump)

  useEffect(() => {
    if (!pendingAnchorJump || !activeFile || content === undefined) return
    if (pendingAnchorJump.path !== activeFile) return

    const frame = requestAnimationFrame(() => {
      scrollToAnchor(pendingAnchorJump.anchor)
      setPendingAnchorJump(null)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingAnchorJump, activeFile, content, setPendingAnchorJump])
}
