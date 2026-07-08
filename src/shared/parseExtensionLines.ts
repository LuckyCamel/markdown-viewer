/**
 * 解析 Markdown 扩展名配置行；空行表示匹配无扩展名文件（如 README、LICENSE）
 */
export function parseExtensionLines(value: string): string[] {
  return value.split('\n').map((line) => line.trim())
}

/**
 * 将扩展名列表格式化为设置面板 textarea 内容
 */
export function formatExtensionLines(extensions: readonly string[]): string {
  return extensions.join('\n')
}
