import { useEffect, useRef } from 'react'
import { ipc } from '../lib/ipc'
import { logError } from '../logger'
import { SCROLL_CONTAINER_SELECTOR } from '../../shared/scrollContainer'
import { migrateReadingPositions } from '../../shared/migrateReadingPositions'

export { SCROLL_CONTAINER_SELECTOR } from '../../shared/scrollContainer'

/** 滚动位置写入防抖间隔（ms） */
const SAVE_DEBOUNCE_MS = 500
/** 恢复滚动位置最大重试次数 */
const RESTORE_MAX_RETRIES = 5
/** 恢复重试基础延迟（ms），实际延迟 = BASE * (attempts + 1) */
const RESTORE_RETRY_BASE_MS = 50

/**
 * 批量写入指定文件的滚动位置到 store（读取现有 → 合并 → 写回）
 * @param activeFile - 当前文件路径
 * @param pos - 待写入的 render/source 位置
 */
async function persistPosition(
  activeFile: string,
  pos: { render: number; source: number },
): Promise<void> {
  try {
    const saved = await ipc.store.get<Record<string, unknown>>('readingPositions')
    const merged = { ...saved, [activeFile]: pos }
    await ipc.store.set('readingPositions', merged)
  } catch (err) {
    logError('useScrollRestore:save', err)
  }
}

/**
 * 保存与恢复 Markdown 阅读滚动位置
 *
 * 写入侧：scroll 事件仅更新 ref 中的待写入位置，500ms 防抖后批量写入 store；
 *         组件卸载时清理定时器并落盘最终位置。
 * 恢复侧：读取后经 migrateReadingPositions 迁移旧格式，双 requestAnimationFrame
 *         确保 DOM 渲染完成；若 scrollHeight 不足则按递增延迟最多重试 5 次。
 *
 * @param activeFile - 当前文件路径
 * @param content - 当前文件内容
 * @param viewMode - 当前视图模式（render/source），默认 render
 */
export function useScrollRestore(
  activeFile: string | null,
  content: string | undefined,
  viewMode: 'render' | 'source' = 'render',
): void {
  /** 待写入的滚动位置（防抖窗口内累积） */
  const pendingPos = useRef<{ render: number; source: number } | null>(null)
  /** 防抖定时器句柄 */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!activeFile) return
    const container = document.querySelector(SCROLL_CONTAINER_SELECTOR)
    if (!container) return

    /**
     * scroll 事件处理：仅更新 pendingPos，并重置防抖定时器
     */
    const handleScroll = () => {
      const top = container.scrollTop
      const prev = pendingPos.current ?? { render: 0, source: 0 }
      pendingPos.current =
        viewMode === 'source'
          ? { render: prev.render, source: top }
          : { render: top, source: prev.source }

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        if (pendingPos.current) {
          const pos = pendingPos.current
          pendingPos.current = null
          void persistPosition(activeFile, pos)
        }
      }, SAVE_DEBOUNCE_MS)
    }

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
      // 清理防抖定时器
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      // 卸载时落盘最终位置
      if (pendingPos.current) {
        const pos = pendingPos.current
        pendingPos.current = null
        void persistPosition(activeFile, pos)
      }
    }
  }, [activeFile, viewMode])

  useEffect(() => {
    if (!activeFile || !content) return
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    ;(async () => {
      const raw = await ipc.store.get<Record<string, unknown>>('readingPositions').catch((err) => {
        logError('useScrollRestore:load', err)
        return undefined
      })
      if (cancelled || !raw) return

      // 迁移旧格式（number）到新格式（{ render, source }）
      const positions = migrateReadingPositions(raw)
      const pos = positions[activeFile]
      if (!pos) return

      const target = viewMode === 'source' ? pos.source : pos.render
      // 目标为 0 时无需恢复
      if (target === 0) return

      const container = document.querySelector(SCROLL_CONTAINER_SELECTOR)
      if (!(container instanceof HTMLElement)) return

      /**
       * 尝试将容器滚动到目标位置
       * @param attempts - 已重试次数（从 0 开始）
       */
      const tryScroll = (attempts: number) => {
        if (cancelled) return
        // 双 requestAnimationFrame 确保 DOM 渲染完成
        requestAnimationFrame(() => {
          if (cancelled) return
          requestAnimationFrame(() => {
            if (cancelled) return
            const maxScroll = container.scrollHeight - container.clientHeight
            // scrollHeight 足够或已达最大重试次数时落定
            if (maxScroll >= target || attempts >= RESTORE_MAX_RETRIES) {
              container.scrollTop = target
            } else {
              // 递增延迟重试：BASE * (attempts + 1)
              retryTimer = setTimeout(
                () => tryScroll(attempts + 1),
                RESTORE_RETRY_BASE_MS * (attempts + 1),
              )
            }
          })
        })
      }
      tryScroll(0)
    })()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [activeFile, content, viewMode])
}
