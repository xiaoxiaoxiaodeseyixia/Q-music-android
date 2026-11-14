import { externalStorageDirectoryPath, readDir, type FileType } from '@/utils/fs'
import { getData, saveData } from '@/plugins/storage'
import { storageDataPrefix, LIST_IDS } from '@/config/constant'
import { readMetadata, type MusicMetadataFull } from '@/utils/localMediaMetadata'
import { formatPlayTime2 } from '@/utils/common'
import { addListMusics, getListMusics } from '@/core/list'
import listState from '@/store/list/state'
import settingState from '@/store/setting/state'

export type ScanMinDuration = 0 | 30 | 60

export interface LocalMusicScanSettings {
  /** 单独扫描的目录；为空时扫描整个外部存储。 */
  scanDirs: string[]
  /** 明确不扫描的目录。 */
  excludeDirs: string[]
  /** 屏蔽时长小于该秒数的音频，0 表示不屏蔽。 */
  minDuration: ScanMinDuration
  /** 不扫描通话录音、铃声、通知音、闹钟等系统音频。 */
  skipSystemAudio: boolean
}

export interface ScanProgress {
  scannedDirs: number
  candidates: number
  processed: number
  phase: 'walk' | 'metadata'
}

export interface ScanResult {
  scannedDirs: number
  candidates: number
  added: number
  skippedByDuration: number
  skippedBySystem: number
  duplicates: number
  metadataFailed: number
  cancelled: boolean
}

export const DEFAULT_SCAN_SETTINGS: LocalMusicScanSettings = {
  scanDirs: [],
  excludeDirs: [],
  minDuration: 30,
  skipSystemAudio: true,
}

const AUDIO_EXTENSIONS = new Set([
  'mp3', 'flac', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'mp4', 'wma', 'ape', 'opus', 'aiff', 'aif', 'alac', 'dsf', 'dff',
])
// 这些格式基本只用于录音/铃声，即使 mimeType 是 audio/* 也不当作音乐。
const NON_MUSIC_EXTENSIONS = new Set(['amr', 'awb', '3gp', '3gpp', 'mid', 'midi', 'imy', 'rtttl', 'ota', 'm4r'])
// 系统音效、铃声与通话录音常见目录名（大小写不敏感）。
const SYSTEM_AUDIO_DIR_PATTERN = /^(ringtones?|alarms?|notifications?|ui[_\s-]?sounds?|sounds|call[_\s-]?record(ings?|er)?|call[_\s-]?rec|recordings?|voice[_\s-]?recorder|sound[_\s-]?recorder|voice[_\s-]?notes?|通话录音|通话|录音|铃声|通知音|闹钟|闹铃)$/i
const SYSTEM_AUDIO_FILE_PATTERN = /(ringtone|notification|alarm|call[_\s-]?record|voice[_\s-]?note|通话录音|通话|录音|铃声|通知音|闹钟|闹铃)/i
// 与音乐无关、且遍历代价高的目录。
const SKIP_DIRS = new Set([
  'android', 'data', 'obb', 'dcim', 'pictures', 'movies', 'camera', '.thumbnails', '.nomedia',
  'lost.dir', 'cache', 'caches', 'temp', 'tmp', 'backup', 'backups', '.trash', 'appdata',
])

const MAX_DEPTH = 12
const MAX_DIRS = 6000
const MAX_FILES = 4000
const METADATA_BATCH_SIZE = 5

const normalizePath = (path: string) => path.replace(/\/+$/, '').toLowerCase()
const isUnder = (path: string, root: string) => {
  const p = normalizePath(path)
  const r = normalizePath(root)
  if (!r) return false
  return p == r || p.startsWith(r.endsWith('/') ? r : `${r}/`)
}
const isExcludedDir = (path: string, dirs: string[]) => dirs.some(dir => isUnder(path, dir))

const getExtension = (name: string) => {
  const index = name.lastIndexOf('.')
  return index > 0 ? name.slice(index + 1).toLowerCase() : ''
}
const isAudioFile = (file: FileType) => {
  const ext = getExtension(file.name ?? '')
  if (NON_MUSIC_EXTENSIONS.has(ext)) return false
  return Boolean(file.mimeType?.startsWith('audio/')) || AUDIO_EXTENSIONS.has(ext)
}

const normalizeSettings = (value: Partial<LocalMusicScanSettings> | null): LocalMusicScanSettings => {
  const minDuration = value?.minDuration
  return {
    scanDirs: Array.isArray(value?.scanDirs) ? value.scanDirs.filter((p): p is string => typeof p == 'string' && !!p) : [],
    excludeDirs: Array.isArray(value?.excludeDirs) ? value.excludeDirs.filter((p): p is string => typeof p == 'string' && !!p) : [],
    minDuration: minDuration == 30 || minDuration == 60 ? minDuration : 0,
    skipSystemAudio: value?.skipSystemAudio !== false,
  }
}

export const getLocalMusicScanSettings = async(): Promise<LocalMusicScanSettings> => {
  const saved = await getData<Partial<LocalMusicScanSettings>>(storageDataPrefix.localMusicScan).catch(() => null)
  return normalizeSettings(saved)
}
export const saveLocalMusicScanSettings = async(settings: LocalMusicScanSettings) => {
  await saveData(storageDataPrefix.localMusicScan, normalizeSettings(settings))
}

const buildMusicInfo = (file: FileType, metadata: MusicMetadataFull): LX.Music.MusicInfoLocal => {
  const fallbackName = file.name.replace(/\.[^.]+$/, '')
  return {
    id: file.path,
    name: metadata.name?.trim() || fallbackName,
    singer: metadata.singer ?? '',
    source: 'local',
    interval: formatPlayTime2(metadata.interval ?? 0),
    meta: {
      albumName: metadata.albumName ?? '',
      filePath: file.path,
      songId: file.path,
      picUrl: '',
      ext: metadata.ext || getExtension(file.name),
    },
  }
}
const buildPlaceholder = (file: FileType): LX.Music.MusicInfoLocal => ({
  id: file.path,
  name: file.name.replace(/\.[^.]+$/, ''),
  singer: '',
  source: 'local',
  interval: null,
  meta: {
    albumName: '',
    filePath: file.path,
    songId: file.path,
    picUrl: '',
    ext: getExtension(file.name),
  },
})

const collectExistingIds = async() => {
  const ids = new Set<string>()
  const listIds = [
    LIST_IDS.DEFAULT,
    LIST_IDS.LOVE,
    LIST_IDS.DOWNLOAD,
    ...listState.userList.map(item => item.id),
  ].filter((id): id is string => typeof id == 'string')
  const groups = await Promise.all(listIds.map(async id => getListMusics(id).catch(() => [] as LX.Music.MusicInfo[])))
  groups.flat().forEach(music => ids.add(music.id))
  return ids
}

interface WalkState { scannedDirs: number, skippedBySystem: number }

const walk = async(
  settings: LocalMusicScanSettings,
  state: WalkState,
  onProgress?: (progress: ScanProgress) => void,
  shouldCancel?: () => boolean,
) => {
  const files: FileType[] = []
  const roots = settings.scanDirs.length
    ? settings.scanDirs.filter(dir => !isExcludedDir(dir, settings.excludeDirs))
    : [externalStorageDirectoryPath]
  const queue: Array<{ path: string, depth: number }> = roots.map(path => ({ path, depth: 0 }))
  while (queue.length) {
    if (shouldCancel?.() === true) break
    if (state.scannedDirs >= MAX_DIRS || files.length >= MAX_FILES) break
    const { path, depth } = queue.shift()!
    if (depth > MAX_DEPTH) continue
    let entries: FileType[]
    try {
      entries = await readDir(path)
    } catch {
      continue
    }
    state.scannedDirs++
    for (const entry of entries) {
      if (shouldCancel?.()) break
      if (entry.isDirectory) {
        const name = entry.name ?? ''
        if (name.startsWith('.') || SKIP_DIRS.has(name.toLowerCase())) continue
        if (settings.skipSystemAudio && SYSTEM_AUDIO_DIR_PATTERN.test(name)) continue
        if (isExcludedDir(entry.path, settings.excludeDirs)) continue
        queue.push({ path: entry.path, depth: depth + 1 })
      } else if (entry.isFile && isAudioFile(entry)) {
        if (settings.skipSystemAudio && SYSTEM_AUDIO_FILE_PATTERN.test(entry.name ?? '')) {
          state.skippedBySystem++
          continue
        }
        files.push(entry)
      }
    }
    onProgress?.({ scannedDirs: state.scannedDirs, candidates: files.length, processed: 0, phase: 'walk' })
  }
  return files
}

/**
 * 按设置扫描本地音频并写入默认列表。
 * 目录白名单 / 黑名单、最短时长、通话与铃声排除都在这里统一处理。
 */
export const scanLocalMusic = async(
  settings: LocalMusicScanSettings,
  onProgress?: (progress: ScanProgress) => void,
  shouldCancel?: () => boolean,
): Promise<ScanResult> => {
  const result: ScanResult = {
    scannedDirs: 0,
    candidates: 0,
    added: 0,
    skippedByDuration: 0,
    skippedBySystem: 0,
    duplicates: 0,
    metadataFailed: 0,
    cancelled: false,
  }
  const state: WalkState = { scannedDirs: 0, skippedBySystem: 0 }
  const files = await walk(settings, state, onProgress, shouldCancel)
  result.scannedDirs = state.scannedDirs
  result.skippedBySystem = state.skippedBySystem
  result.candidates = files.length
  if (shouldCancel?.()) { result.cancelled = true; return result }

  const existingIds = await collectExistingIds()
  const targets = files.filter(file => {
    if (existingIds.has(file.path)) { result.duplicates++; return false }
    return true
  })

  const musicInfos: LX.Music.MusicInfoLocal[] = []
  for (let index = 0; index < targets.length; index += METADATA_BATCH_SIZE) {
    if (shouldCancel?.()) { result.cancelled = true; break }
    const batch = targets.slice(index, index + METADATA_BATCH_SIZE)
    const metadatas = await Promise.all(batch.map(async file => readMetadata(file.path).catch(() => null)))
    batch.forEach((file, i) => {
      const metadata = metadatas[i]
      if (!metadata) {
        result.metadataFailed++
        musicInfos.push(buildPlaceholder(file))
        return
      }
      if (settings.minDuration > 0 && Number(metadata.interval) < settings.minDuration) {
        result.skippedByDuration++
        return
      }
      musicInfos.push(buildMusicInfo(file, metadata))
    })
    onProgress?.({
      scannedDirs: result.scannedDirs,
      candidates: result.candidates,
      processed: Math.min(index + batch.length, targets.length),
      phase: 'metadata',
    })
  }

  if (musicInfos.length) {
    await addListMusics(LIST_IDS.DEFAULT, musicInfos, settingState.setting['list.addMusicLocationType'])
    result.added = musicInfos.length
  }
  return result
}
