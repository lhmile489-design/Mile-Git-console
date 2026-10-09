import { resolve } from 'path'
import { cpSync } from 'fs'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

// 构建后把 SQL 迁移脚本复制到 out/main/migrations（db.ts 运行时按 __dirname 读取）
function copyMigrations(): { name: string; closeBundle: () => void } {
  return {
    name: 'copy-migrations',
    closeBundle() {
      cpSync('src/main/storage/migrations', 'out/main/migrations', {
        recursive: true
      })
    }
  }
}

const sharedAlias = {
  '@shared': resolve('src/shared')
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyMigrations()],
    resolve: {
      alias: {
        ...sharedAlias
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        ...sharedAlias
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src'),
        '@resources': resolve('resources'),
        ...sharedAlias
      }
    },
    plugins: [react()]
  }
})
