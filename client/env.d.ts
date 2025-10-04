/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Declare CSS modules
declare module '*.css' {
  const content: Record<string, string>
  export default content
}

// You might also want to add these for other asset types
declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}