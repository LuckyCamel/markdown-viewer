import type { ReactNode } from 'react'

interface LayoutProps {
  sidebar: ReactNode
  main: ReactNode
  outline: ReactNode
  sidebarVisible: boolean
  outlineVisible: boolean
}

export function Layout({ sidebar, main, outline, sidebarVisible, outlineVisible }: LayoutProps) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {sidebarVisible && (
          <aside className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
            {sidebar}
          </aside>
        )}
        <main className="flex-1 overflow-y-auto">
          {main}
        </main>
        {outlineVisible && (
          <aside className="w-56 border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
            {outline}
          </aside>
        )}
      </div>
    </div>
  )
}
