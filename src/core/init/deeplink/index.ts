import { Linking } from 'react-native'
import { isQQCallback } from '@/core/musicAccount/login'
import { errorDialog } from './utils'
import { handleMusicAction } from './musicAction'
import { handlePlayerAction, type PlayerAction } from './playerAction'
import { handleSonglistAction } from './songlistAction'
import { handleSyncAction } from './syncAction'
import { extname, stat } from '@/utils/fs'
import { handleFileMusicAction, handleFileJSAction, handleFileLXMCAction } from './fileAction'


const handleLinkAction = async(link: string) => {
  // console.log(link)
  const [url, search] = link.split('?')
  const [type, action, ...paths] = url.replace('qmusic://', '').split('/')
  // data 在解析后是任意 JSON 值，由各 action 自行校验；这里不要把它固定声明为 string，
  // 否则与需要结构化 data 的 sync action 签名冲突。
  const params: {
    paths: string[]
    [key: string]: any
  } = {
    paths: [],
  }
  if (search) {
    for (const param of search.split('&')) {
      const [key, value] = param.split('=')
      params[key] = value
    }
    const rawData: unknown = params.data
    if (typeof rawData == 'string') params.data = JSON.parse(decodeURIComponent(rawData))
  }
  params.paths = paths.map(p => decodeURIComponent(p))
  console.log(params)
  switch (type) {
    case 'music':
      await handleMusicAction(action, params)
      break
    case 'songlist':
      await handleSonglistAction(action, params)
      break
    case 'player':
      await handlePlayerAction(action as PlayerAction)
      break
    case 'sync':
      // sync action 只消费 data，显式取出可避免弱类型检查把通用 params 判为无公共属性。
      await handleSyncAction(action, { data: params.data })
      break
    // default: throw new Error('Unknown type: ' + type)
  }
}

const handleFileAction = async(link: string) => {
  const file = await stat(link)
  // console.log(file)
  switch (extname(file.name)) {
    case 'json':
    case 'lxmc':
      await handleFileLXMCAction(file)
      break
    case 'js':
      await handleFileJSAction(file)
      break
    case 'ogg':
    case 'flac':
    case 'wav':
    case 'mp3':
      await handleFileMusicAction(file)
      break
    default:
      if (!file.mimeType?.startsWith('audio/')) throw new Error('Unknown file type')
      await handleFileMusicAction(file)
      break
  }
}

// const handleHttpAction = async(link: string) => {
// }


const runLinkAction = async(link: string) => {
  if (link.startsWith('qmusic://')) {
    try {
      await handleLinkAction(link)
    } catch (err: any) {
      errorDialog(err.message)
      // focusWindow()
    }
  } else if (link.startsWith('file://') || link.startsWith('content://')) {
    try {
      await handleFileAction(link)
    } catch (err: any) {
      errorDialog(err.message)
      // focusWindow()
    }
  }
  //  else if (/^https?:\/\//.test(link)) {
  //   try {
  //     await handleHttpAction(link)
  //   } catch (err: any) {
  //     errorDialog(err.message)
  //     // focusWindow()
  //   }
  // }
}

export const initDeeplink = async() => {
  Linking.addEventListener('url', ({ url }) => {
    // 配对码含短时密钥，只由账号页扫码/粘贴处理，禁止进入通用日志。
    if (url.startsWith('qmusic://account-transfer')) return
    // 授权回跳由账号页接收，不能把临时凭证写入通用深链日志。
    if (isQQCallback(url)) return
    void runLinkAction(url)
    console.log('deeplink', url)
  })
  const initialUrl = await Linking.getInitialURL()
  if (initialUrl == null) return
  if (initialUrl.startsWith('qmusic://account-transfer')) return
  if (isQQCallback(initialUrl)) return
  console.log('deeplink', initialUrl)
  void runLinkAction(initialUrl)
}
