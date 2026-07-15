/**
 * 文件名验证结果枚举
 */
export enum FileNameValidationError {
  /** 验证通过 */
  VALID = 'valid',
  /** 名称为空 */
  EMPTY = 'empty',
  /** 包含非法字符 */
  INVALID_CHARACTER = 'invalid_character',
  /** 非法名称（如 . 或 ..） */
  INVALID_NAME = 'invalid_name',
}

/**
 * 验证文件名是否合法
 *
 * 检查规则：
 * - 不能为空（含仅空白字符）
 * - 不能包含路径分隔符（/ \）及其他 Windows 非法字符（: * ? " < > |）
 * - 不能仅为 . 或 ..
 *
 * @param name - 待验证的文件名
 * @returns 验证通过返回 true，失败返回对应的错误类型
 */
export function validateFileName(name: string): true | FileNameValidationError {
  const trimmed = name.trim()

  if (trimmed.length === 0) {
    return FileNameValidationError.EMPTY
  }

  if (trimmed === '.' || trimmed === '..') {
    return FileNameValidationError.INVALID_NAME
  }

  const invalidChars = /[\\/:*?"<>|\t\n\r]/
  if (invalidChars.test(trimmed)) {
    return FileNameValidationError.INVALID_CHARACTER
  }

  return true
}
