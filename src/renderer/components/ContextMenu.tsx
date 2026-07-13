import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface ContextMenuItem {
  /** 显示文案 */
  label: string
  /** 点击回调；为 undefined 时视为分隔符 */
  onClick?: () => void
  /** 是否禁用 */
  disabled?: boolean
}

interface ContextMenuProps {
  /** 屏幕坐标（clientX/clientY） */
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

/**
 * 通用右键菜单浮层
 *
 * - 通过 `position: fixed` 渲染到 body 层，避免父级 overflow 裁剪
 * - 自动测量菜单尺寸，越界时翻转至左/上侧
 * - 点击外部、Escape、滚动时自动关闭
 */
export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  /**
   * 测量菜单尺寸并调整位置，避免溢出视口
   */
  useLayoutEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const padding = 4
    let left = x
    let top = y
    if (x + rect.width + padding > window.innerWidth) {
      left = Math.max(padding, window.innerWidth - rect.width - padding)
    }
    if (y + rect.height + padding > window.innerHeight) {
      top = Math.max(padding, window.innerHeight - rect.height - padding)
    }
    setPosition({ left, top })
  }, [x, y])

  useEffect(() => {
    /**
     * 关闭菜单：右键事件本身（避免新菜单）、点击外部、Escape、滚动
     */
    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleClose = () => onClose()

    document.addEventListener('contextmenu', handleClose, true)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', handleClose)
    window.addEventListener('wheel', handleClose, { passive: true })

    return () => {
      document.removeEventListener('contextmenu', handleClose, true)
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', handleClose)
      window.removeEventListener('wheel', handleClose)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ left: position.left, top: position.top }}
      className="fixed z-[60] min-w-[160px] py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg text-sm select-none"
    >
      {items.map((item, idx) => {
        if (!item.onClick) {
          return <div key={idx} className="my-1 border-t border-gray-200 dark:border-gray-700" />
        }
        return (
          <button
            key={idx}
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              item.onClick?.()
              onClose()
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-200"
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
