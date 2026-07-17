import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { logError } from '../logger'
import { MENU_ID_TO_COMMAND_ID, type MenuActionId } from '../lib/menuActions'
import { commandRegistry } from '../features/commands/commands'

/**
 * 监听 Rust 原生菜单点击事件，通过 commandRegistry 统一分发执行
 */
export function useMenuEvents(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined

    listen<string>('menu-action', (event) => {
      const id = event.payload as MenuActionId
      const commandId = MENU_ID_TO_COMMAND_ID[id]
      if (commandId) {
        commandRegistry.execute(commandId)
      }
    })
      .then((fn) => {
        unlisten = fn
      })
      .catch((err) => logError('useMenuEvents:listen', err))

    return () => {
      unlisten?.()
    }
  }, [])
}
