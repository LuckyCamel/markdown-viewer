import { Component, type ReactNode, type ErrorInfo } from 'react'
import { logError } from '../logger'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logError('ErrorBoundary', error)
    if (info.componentStack) {
      console.error(info.componentStack)
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <div className="text-center p-8">
            <h1 className="text-xl font-semibold mb-2">出错了</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              应用遇到意外错误，请查看控制台了解详情。
            </p>
            <pre className="text-xs text-left bg-gray-100 dark:bg-gray-800 p-4 rounded max-w-lg overflow-auto">
              {this.state.error.message}
            </pre>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
