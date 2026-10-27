// Vite 静态资源：PNG / JPG / SVG 等图片模块，import 后得到资源 URL 字符串
// 本文件不得包含顶层 import/export，否则会变成模块文件，通配模块声明失效
declare module '*.png' {
  const src: string
  export default src
}
declare module '*.jpg' {
  const src: string
  export default src
}
declare module '*.svg' {
  const src: string
  export default src
}
