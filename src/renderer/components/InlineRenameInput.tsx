import React, { useRef, useEffect, useState } from 'react'

/**
 * 验证结果类型
 */
export type ValidationError = string

/**
 * 行内重命名/新建输入框组件
 *
 * 用于文件树中新建文件/文件夹、重命名等场景的行内编辑。
 * 特性：自动聚焦、全选初始值、Enter 确认、Esc 取消、可配置失焦行为。
 */
export interface InlineRenameInputProps {
  /** 初始值 */
  initialValue: string
  /** 占位符 */
  placeholder?: string
  /** 提交回调，返回新名称 */
  onSubmit: (value: string) => void
  /** 取消回调 */
  onCancel: () => void
  /** 验证函数，返回错误信息或 null（通过） */
  validate?: (value: string) => ValidationError | null
  /** 失焦时是否自动提交，默认 false */
  submitOnBlur?: boolean
  /** 是否在挂载时立即验证初始值，默认 false */
  initialValidation?: boolean
  /** 自定义类名 */
  className?: string
}

/**
 * 行内重命名输入框组件
 */
export function InlineRenameInput({
  initialValue,
  placeholder,
  onSubmit,
  onCancel,
  validate,
  submitOnBlur = false,
  initialValidation = false,
  className,
}: InlineRenameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<ValidationError | null>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
    if (initialValidation && validate) {
      const result = validate(initialValue.trim())
      setError(result)
    }
    // 故意只在挂载时执行：focus/select 和初始验证不应在依赖变化时重复触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * 执行验证
   */
  const doValidate = (val: string): boolean => {
    if (!validate) return true
    const result = validate(val)
    setError(result)
    return result === null
  }

  /**
   * 提交
   */
  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!doValidate(trimmed)) return
    onSubmit(trimmed)
  }

  /**
   * 键盘事件处理
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  /**
   * 失焦处理
   */
  const handleBlur = () => {
    if (submitOnBlur) {
      handleSubmit()
    }
  }

  /**
   * 值变化处理
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    if (error && validate) {
      const result = validate(newValue.trim())
      setError(result)
    }
  }

  return (
    <div className={`inline-rename-input ${className || ''}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full px-2 py-1 text-sm border rounded outline-none bg-transparent ${
          error ? 'border-red-500 focus:border-red-500' : 'border-blue-500 focus:border-blue-500'
        }`}
      />
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  )
}
