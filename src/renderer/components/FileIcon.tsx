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

function FileTypeIcon({ size, color, letter }: { size: number; color: string; letter: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={color}>
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
        {letter}
      </text>
    </svg>
  )
}

export function FileIcon({ name, isDirectory, isOpen, size = ICON_SIZE }: FileIconProps) {
  if (isDirectory) {
    return <FolderIcon open={!!isOpen} size={size} />
  }

  const ext = name.split('.').pop()?.toLowerCase() || ''
  const basename = name.toLowerCase()

  const markdownExts = ['md', 'markdown', 'mdown', 'mkd']
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff']
  const pdfExts = ['pdf']
  const textExts = ['txt', 'log', 'readme', 'license', 'mdx', 'rst', 'tex']

  if (markdownExts.includes(ext)) return <FileMdIcon size={size} />
  if (imageExts.includes(ext)) return <FileImageIcon size={size} />
  if (pdfExts.includes(ext)) return <FilePdfIcon size={size} />
  if (textExts.includes(ext)) return <FileTextIcon size={size} />

  const languageIcons: Record<string, { color: string; letter: string }> = {
    rs: { color: 'text-orange-600', letter: 'RS' },
    rust: { color: 'text-orange-600', letter: 'RS' },
    go: { color: 'text-blue-600', letter: 'GO' },
    py: { color: 'text-yellow-600', letter: 'PY' },
    pyw: { color: 'text-yellow-600', letter: 'PY' },
    pyi: { color: 'text-yellow-600', letter: 'PY' },
    ts: { color: 'text-blue-600', letter: 'TS' },
    tsx: { color: 'text-blue-600', letter: 'TS' },
    js: { color: 'text-yellow-500', letter: 'JS' },
    jsx: { color: 'text-yellow-500', letter: 'JS' },
    mjs: { color: 'text-yellow-500', letter: 'JS' },
    cjs: { color: 'text-yellow-500', letter: 'JS' },
    java: { color: 'text-red-600', letter: 'JA' },
    c: { color: 'text-cyan-600', letter: 'C' },
    h: { color: 'text-cyan-600', letter: 'H' },
    cpp: { color: 'text-cyan-600', letter: 'CPP' },
    cc: { color: 'text-cyan-600', letter: 'CPP' },
    cxx: { color: 'text-cyan-600', letter: 'CPP' },
    hpp: { color: 'text-cyan-600', letter: 'HPP' },
    hh: { color: 'text-cyan-600', letter: 'HPP' },
    cs: { color: 'text-purple-600', letter: 'CS' },
    csx: { color: 'text-purple-600', letter: 'CS' },
    php: { color: 'text-purple-600', letter: 'PHP' },
    phtml: { color: 'text-purple-600', letter: 'PHP' },
    rb: { color: 'text-red-500', letter: 'RB' },
    ruby: { color: 'text-red-500', letter: 'RB' },
    swift: { color: 'text-orange-500', letter: 'SW' },
    kt: { color: 'text-purple-600', letter: 'KT' },
    kts: { color: 'text-purple-600', letter: 'KT' },
    dart: { color: 'text-blue-500', letter: 'D' },
    sh: { color: 'text-gray-600', letter: 'SH' },
    bash: { color: 'text-gray-600', letter: 'SH' },
    zsh: { color: 'text-gray-600', letter: 'SH' },
    sql: { color: 'text-orange-500', letter: 'SQL' },
    html: { color: 'text-orange-500', letter: 'HTML' },
    htm: { color: 'text-orange-500', letter: 'HTML' },
    css: { color: 'text-blue-500', letter: 'CSS' },
    scss: { color: 'text-blue-500', letter: 'SCSS' },
    less: { color: 'text-blue-500', letter: 'LESS' },
    vue: { color: 'text-green-600', letter: 'VUE' },
    svelte: { color: 'text-orange-500', letter: 'SV' },
    json: { color: 'text-yellow-600', letter: 'JSON' },
    jsonc: { color: 'text-yellow-600', letter: 'JSON' },
    yaml: { color: 'text-blue-500', letter: 'YML' },
    yml: { color: 'text-blue-500', letter: 'YML' },
    toml: { color: 'text-green-600', letter: 'TOML' },
    ini: { color: 'text-gray-500', letter: 'INI' },
    cfg: { color: 'text-gray-500', letter: 'INI' },
    xml: { color: 'text-green-600', letter: 'XML' },
    scala: { color: 'text-red-600', letter: 'SC' },
    lua: { color: 'text-blue-500', letter: 'LUA' },
    pl: { color: 'text-blue-600', letter: 'PL' },
    pm: { color: 'text-blue-600', letter: 'PL' },
    r: { color: 'text-blue-600', letter: 'R' },
    hs: { color: 'text-orange-500', letter: 'HS' },
    lhs: { color: 'text-orange-500', letter: 'HS' },
    dockerfile: { color: 'text-blue-600', letter: 'DK' },
    mk: { color: 'text-gray-600', letter: 'MK' },
    mak: { color: 'text-gray-600', letter: 'MK' },
  }

  const namedFiles: Record<string, { color: string; letter: string }> = {
    makefile: { color: 'text-gray-600', letter: 'MK' },
    dockerfile: { color: 'text-blue-600', letter: 'DK' },
    '.dockerignore': { color: 'text-gray-500', letter: 'IG' },
    '.gitignore': { color: 'text-gray-500', letter: 'IG' },
    '.env': { color: 'text-gray-500', letter: 'ENV' },
    license: { color: 'text-gray-500', letter: 'LIC' },
    readme: { color: 'text-blue-500', letter: 'MD' },
  }

  if (ext in languageIcons) {
    const { color, letter } = languageIcons[ext]
    return <FileTypeIcon size={size} color={color} letter={letter} />
  }

  if (basename in namedFiles) {
    const { color, letter } = namedFiles[basename]
    return <FileTypeIcon size={size} color={color} letter={letter} />
  }

  return <FileCodeIcon size={size} />
}
