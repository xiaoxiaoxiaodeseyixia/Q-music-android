import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'

import Button from '@/components/common/Button'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import ContentState from '@/components/common/ContentState'
import { useDockInset } from '@/components/common/DockInset'
import TrackArtwork from '@/components/TrackArtwork'
import { LIST_IDS } from '@/config/constant'
import { getListMusics } from '@/core/list'
import { playAllFromPage, playFromPage } from '@/core/player/selection'
import { useI18n } from '@/lang'
import { usePlayMusicInfo } from '@/store/player/hook'
import listState from '@/store/list/state'
import { useTheme } from '@/store/theme/hook'
import { toast } from '@/utils/tools'
import { getLocalMusicScanSettings, scanLocalMusic, type ScanProgress } from '@/utils/localMusicScan'
import { handleImportMediaFile } from '../Mylist/MyList/listAction'
import ScanSettings, { type ScanSettingsType } from './ScanSettings'

const PAGE_KEY = 'local_music'

/** 汇总各歌单中的本地文件，按歌曲 id 去重，保持与「我的列表」同一数据源。 */
const useLocalMusics = () => {
  const [list, setList] = useState<LX.Music.MusicInfoLocal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async() => {
      try {
        const ids = [
          LIST_IDS.DEFAULT,
          LIST_IDS.LOVE,
          LIST_IDS.DOWNLOAD,
          ...listState.userList.map(item => item.id),
        ].filter((id): id is string => typeof id == 'string')
        const groups = await Promise.all(ids.map(async id => getListMusics(id).catch(() => [] as LX.Music.MusicInfo[])))
        const unique = new Map<string, LX.Music.MusicInfoLocal>()
        groups.flat().forEach(music => {
          if (music.source == 'local') unique.set(music.id, music)
        })
        if (active) setList([...unique.values()])
      } catch {
        if (active) setList([])
      } finally {
        if (active) setLoading(false)
      }
    }
    const handleUpdate = () => { void load() }
    void load()
    global.app_event.on('myListMusicUpdate', handleUpdate)
    global.state_event.on('mylistUpdated', handleUpdate)
    global.state_event.on('mylistToggled', handleUpdate)
    return () => {
      active = false
      global.app_event.off('myListMusicUpdate', handleUpdate)
      global.state_event.off('mylistUpdated', handleUpdate)
      global.state_event.off('mylistToggled', handleUpdate)
    }
  }, [])

  return { list, loading }
}

const MusicRow = ({ item, index, active, onPress }: {
  item: LX.Music.MusicInfoLocal
  index: number
  active: boolean
  onPress: () => void
}) => {
  const theme = useTheme()
  const t = useI18n()
  return (
    <Button
      accessibilityRole="button"
      accessibilityLabel={`${item.name} · ${item.singer || t('history_source_local')}`}
      accessibilityState={{ selected: active }}
      style={[styles.row, active && { backgroundColor: theme['q-surface-tint'], borderRadius: 10 }]}
      onPress={onPress}
    >
      {active
        ? <Icon accessible={false} style={styles.index} name="play-outline" size={13} color={theme['q-accent-text']} />
        : <Text style={styles.index} size={13} color={theme['q-text-secondary']}>{index + 1}</Text>}
      <TrackArtwork item={item} style={styles.artwork} />
      <View style={styles.info}>
        <Text size={14} color={active ? theme['q-accent-text'] : theme['q-text-primary']} numberOfLines={1}>{item.name}</Text>
        <Text size={11} color={theme['q-text-secondary']} numberOfLines={1}>
          {item.singer || t('history_source_local')}{item.interval ? ` · ${item.interval}` : ''}
        </Text>
      </View>
      <Icon accessible={false} name="play" rawSize={14} color={theme['q-text-secondary']} style={styles.rowPlay} />
    </Button>
  )
}

export default () => {
  const theme = useTheme()
  const t = useI18n()
  const dockInset = useDockInset()
  const { list, loading } = useLocalMusics()
  const { musicInfo } = usePlayMusicInfo()
  const currentId = musicInfo && !('progress' in musicInfo) ? musicInfo.id : null
  const choosePathRef = useRef<ChoosePathType>(null)
  const scanSettingsRef = useRef<ScanSettingsType>(null)
  const cancelScanRef = useRef(false)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null)

  const handleImport = useCallback(() => {
    choosePathRef.current?.show({
      title: t('list_select_local_file_desc'),
      dirOnly: true,
      isPersist: true,
    })
  }, [t])
  const handleConfirmPath = useCallback((path: string) => {
    void handleImportMediaFile(listState.defaultList, path)
  }, [])
  const play = useCallback((index: number) => {
    void playFromPage(PAGE_KEY, list, index).catch(() => { toast(t('load_failed')) })
  }, [list, t])
  const playAll = useCallback(() => {
    void playAllFromPage(PAGE_KEY, list).catch(() => { toast(t('load_failed')) })
  }, [list, t])
  const startScan = useCallback(async() => {
    if (scanning) return
    cancelScanRef.current = false
    setScanning(true)
    setScanProgress({ scannedDirs: 0, candidates: 0, processed: 0, phase: 'walk' })
    try {
      const settings = await getLocalMusicScanSettings()
      const result = await scanLocalMusic(settings, setScanProgress, () => cancelScanRef.current)
      if (result.cancelled) toast(t('local_scan_cancelled'))
      else if (!result.added) toast(t('local_scan_empty'))
      else {
        toast(t('local_scan_result', {
          added: result.added,
          short: result.skippedByDuration,
          system: result.skippedBySystem,
          dup: result.duplicates,
        }), 'long')
      }
    } catch {
      toast(t('load_failed'))
    } finally {
      setScanning(false)
      setScanProgress(null)
    }
  }, [scanning, t])
  const cancelScan = useCallback(() => { cancelScanRef.current = true }, [])

  const header = useMemo(() => (
    <View style={styles.header}>
      <View style={[styles.summary, { backgroundColor: theme['q-surface-raised'], borderColor: theme['q-outline'] }]}>
        <View style={[styles.summaryIcon, { backgroundColor: theme['q-surface-tint'] }]}>
          <Icon accessible={false} name="folder" rawSize={20} color={theme['q-accent-text']} />
        </View>
        <View style={styles.summaryInfo}>
          <Text size={14} color={theme['q-text-primary']} numberOfLines={1}>
            {list.length ? t('local_music_count', { count: list.length }) : t('local_music_empty')}
          </Text>
          <Text size={11} color={theme['q-text-secondary']} numberOfLines={1}>{t('history_source_local')}</Text>
        </View>
        <Button
          accessibilityRole="button"
          accessibilityLabel={t('list_select_local_file')}
          style={[styles.importButton, { backgroundColor: theme['q-surface-tint'] }]}
          onPress={handleImport}
        >
          <Icon accessible={false} name="add" rawSize={14} color={theme['q-accent-text']} />
          <Text size={12} color={theme['q-accent-text']} numberOfLines={1}>{t('list_select_local_file')}</Text>
        </Button>
      </View>
      <View style={styles.actions}>
        <Button
          accessibilityRole="button"
          accessibilityLabel={t('local_scan_start')}
          disabled={scanning}
          style={[styles.scanButton, { backgroundColor: theme['q-accent'] }]}
          onPress={() => { void startScan() }}
        >
          <Icon accessible={false} name="search-2" rawSize={14} color={theme['q-on-accent']} />
          <Text size={13} color={theme['q-on-accent']} numberOfLines={1}>{t('local_scan_start')}</Text>
        </Button>
        <Button
          accessibilityRole="button"
          accessibilityLabel={t('local_scan_settings')}
          style={[styles.scanSettingsButton, { backgroundColor: theme['q-surface-tint'] }]}
          onPress={() => { scanSettingsRef.current?.show() }}
        >
          <Icon accessible={false} name="setting" rawSize={16} color={theme['q-accent-text']} />
        </Button>
      </View>
      {scanProgress
        ? <View style={[styles.progressRow, { backgroundColor: theme['q-surface-raised'], borderColor: theme['q-outline'] }]}>
            <Text size={11} color={theme['q-text-secondary']} style={styles.progressText} numberOfLines={2}>
              {t(scanProgress.phase == 'walk' ? 'local_scan_progress_walk' : 'local_scan_progress_meta', {
                dirs: scanProgress.scannedDirs,
                count: scanProgress.candidates,
                done: scanProgress.processed,
              })}
            </Text>
            <Button accessibilityLabel={t('local_scan_cancel')} style={styles.progressCancel} onPress={cancelScan}>
              <Text size={12} color={theme['q-accent-text']}>{t('local_scan_cancel')}</Text>
            </Button>
          </View>
        : null}
      {list.length
        ? <Button
            accessibilityRole="button"
            accessibilityLabel={t('play_all')}
            style={[styles.playAll, { backgroundColor: theme['q-surface-tint'] }]}
            onPress={playAll}
          >
            <Icon accessible={false} name="play" rawSize={14} color={theme['q-accent-text']} />
            <Text size={13} color={theme['q-accent-text']}>{t('play_all')} · {list.length}</Text>
          </Button>
        : null}
    </View>
  ), [cancelScan, handleImport, list.length, playAll, scanProgress, scanning, startScan, t, theme])

  return (
    <View style={[styles.container, { backgroundColor: theme['c-main-background'] }]}>
      <View style={styles.content}>
        {loading
          ? <ContentState status="loading" />
          : <FlatList
              data={list}
              keyExtractor={item => item.id}
              contentContainerStyle={[{ paddingBottom: dockInset + 8 }, !list.length && styles.emptyList]}
              style={styles.list}
              ListHeaderComponent={header}
              renderItem={({ item, index }) => (
                <MusicRow item={item} index={index} active={currentId == item.id} onPress={() => { play(index) }} />
              )}
              ListEmptyComponent={(
                <View style={styles.empty}>
                  <Icon accessible={false} name="folder" rawSize={36} color={theme['q-text-secondary']} />
                  <Text size={15} style={styles.emptyTitle} color={theme['q-text-primary']}>{t('local_music_empty')}</Text>
                  <Button style={[styles.emptyButton, { backgroundColor: theme['q-surface-tint'] }]} onPress={handleImport}>
                    <Text size={13} color={theme['q-accent-text']}>{t('list_select_local_file')}</Text>
                  </Button>
                </View>
              )}
            />}
      </View>
      <ChoosePath ref={choosePathRef} onConfirm={handleConfirmPath} />
      <ScanSettings ref={scanSettingsRef} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, width: '100%', maxWidth: 960, alignSelf: 'center' },
  list: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
  emptyList: { flexGrow: 1 },
  header: { gap: 10, marginBottom: 8 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summaryInfo: { flex: 1, minWidth: 0, gap: 3 },
  importButton: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36, paddingHorizontal: 12, borderRadius: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, borderRadius: 14 },
  scanSettingsButton: { width: 46, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  progressText: { flex: 1, minWidth: 0, lineHeight: 16 },
  progressCancel: { minHeight: 36, paddingHorizontal: 8, justifyContent: 'center', borderRadius: 12 },
  playAll: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: 14 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingHorizontal: 6, gap: 10 },
  index: { width: 24, textAlign: 'center' },
  artwork: { width: 40, height: 40, borderRadius: 8, flexShrink: 0 },
  info: { flex: 1, minWidth: 0, gap: 3 },
  rowPlay: { width: 24, textAlign: 'center' },
  empty: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: 14 },
  emptyTitle: { textAlign: 'center' },
  emptyButton: { minHeight: 42, paddingHorizontal: 20, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
})
