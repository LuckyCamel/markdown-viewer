export default {
  'src/**/*.{ts,tsx,js,jsx,json,css,md}': ['prettier --check'],
  'src/**/*.{ts,tsx}': () => [
    'tsc --noEmit -p tsconfig.node.json --pretty',
    'tsc --noEmit -p tsconfig.web.json --pretty',
  ],
}
