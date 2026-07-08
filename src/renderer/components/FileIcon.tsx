interface FileIconProps {
  name: string
  isDirectory?: boolean
  isOpen?: boolean
  size?: number
}

const ICON_SIZE = 16

function FolderIcon({ open, size }: { open: boolean; size: number }) {
  if (open) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-yellow-500">
        <path
          d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M3 9H21V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V9Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-yellow-500">
      <path
        d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function FileMdIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-blue-500">
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M14 2V8H20" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fill="white"
        fontSize="7"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        MD
      </text>
    </svg>
  )
}

function FileTextIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-gray-500">
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M14 2V8H20" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
      <path
        d="M8 12H16"
        stroke="white"
        strokeOpacity="0.7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 16H13"
        stroke="white"
        strokeOpacity="0.7"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function FileCodeIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-green-600">
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M14 2V8H20" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
      <path
        d="M10 16L7 13L10 10"
        stroke="white"
        strokeOpacity="0.8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 10L17 13L14 16"
        stroke="white"
        strokeOpacity="0.8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FileImageIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-purple-500">
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M14 2V8H20" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="9" cy="13" r="2" fill="white" fillOpacity="0.8" />
      <path
        d="M20 17L16 13L7 22"
        stroke="white"
        strokeOpacity="0.8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FilePdfIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-red-500">
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M14 2V8H20" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fill="white"
        fontSize="6"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        PDF
      </text>
    </svg>
  )
}

function FileDefaultIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="text-gray-400">
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M14 2V8H20" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" />
    </svg>
  )
}

/**
 * 根据文件名返回对应文件类型图标
 *
 * 图标类型：
 * - 文件夹：folder / folder-open
 * - Markdown：MD 标识的蓝色文件
 * - 代码：绿色文件带代码符号
 * - 图片：紫色文件带图片符号
 * - PDF：红色文件带 PDF 标识
 * - 文本：灰色文件带横线
 * - 默认：通用灰色文件
 */
export function FileIcon({ name, isDirectory, isOpen, size = ICON_SIZE }: FileIconProps) {
  if (isDirectory) {
    return <FolderIcon open={!!isOpen} size={size} />
  }

  const ext = name.split('.').pop()?.toLowerCase() || ''

  const markdownExts = ['md', 'markdown', 'mdown', 'mkd']
  const codeExts = [
    'ts',
    'tsx',
    'js',
    'jsx',
    'rs',
    'go',
    'py',
    'java',
    'c',
    'cpp',
    'h',
    'rb',
    'php',
    'swift',
    'kt',
    'scala',
    'sh',
    'bash',
    'json',
    'yaml',
    'yml',
    'toml',
    'xml',
    'html',
    'css',
    'scss',
    'less',
    'vue',
    'svelte',
  ]
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff']
  const pdfExts = ['pdf']
  const textExts = ['txt', 'log', 'readme', 'license', 'mdx', 'rst', 'tex']

  if (markdownExts.includes(ext)) return <FileMdIcon size={size} />
  if (codeExts.includes(ext)) return <FileCodeIcon size={size} />
  if (imageExts.includes(ext)) return <FileImageIcon size={size} />
  if (pdfExts.includes(ext)) return <FilePdfIcon size={size} />
  if (textExts.includes(ext)) return <FileTextIcon size={size} />

  return <FileDefaultIcon size={size} />
}
