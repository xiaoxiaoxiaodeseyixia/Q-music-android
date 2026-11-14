import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Switch, View } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import Modal, { type ModalType } from '@/components/common/Modal'
import ChoosePath, { type ChoosePathType } from '@/components/common/ChoosePath'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import {
  DEFAULT_SCAN_SETTINGS,
  getLocalMusicScanSettings,
  saveLocalMusicScanSettings,
  type LocalMusicScanSettings,
  type ScanMinDuration,
} from '@/utils/localMusicScan'

export interface ScanSettingsType {
  show: () => void
}

interface Props {
  onSaved?: (settings: LocalMusicScanSettings) => void
}

const DURATIONS: ReadonlyArray<{ value: ScanMinDuration, label: 'local_scan_duration_off' | 'local_scan_duration_30' | 'local_scan_duration_60' }> = [
  { value: 0, label: 'local_scan_duration_off' },
  { value: 30, label: 'local_scan_duration_30' },
  { value: 60, label: 'local_scan_duration_60' },
]

export default forwardRef<ScanSettingsType, Props>(({ onSaved }, ref) => {
  const theme = useTheme()
  const t = useI18n()
  const modalRef = useRef<ModalType>(null)
  const choosePathRef = useRef<ChoosePathType>(null)
  const pickMode = useRef<'scan' | 'exclude'>('scan')
  const [settings, setSettings] = useState<LocalMusicScanSettings>(DEFAULT_SCAN_SETTINGS)

  useImperativeHandle(ref, () => ({
    show() {
      void getLocalMusicScanSettings().then(saved => {
        setSettings(saved)
        modalRef.current?.setVisible(true)
      })
    },
  }), [])

  const update = (patch: Partial<LocalMusicScanSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
  }
  const addDir = (path: string) => {
    const key = pickMode.current == 'scan' ? 'scanDirs' : 'excludeDirs'
    setSettings(prev => prev[key].includes(path) ? prev : { ...prev, [key]: [...prev[key], path] })
  }
  const removeDir = (key: 'scanDirs' | 'excludeDirs', path: string) => {
    setSettings(prev => ({ ...prev, [key]: prev[key].filter(item => item != path) }))
  }
  const openPicker = (mode: 'scan' | 'exclude') => {
    pickMode.current = mode
    choosePathRef.current?.show({
      title: t(mode == 'scan' ? 'local_scan_pick_scan_dir' : 'local_scan_pick_exclude_dir'),
      dirOnly: true,
      isPersist: true,
    })
  }
  const save = () => {
    void saveLocalMusicScanSettings(settings).then(() => {
      onSaved?.(settings)
      modalRef.current?.setVisible(false)
    })
  }

  const dirSection = (key: 'scanDirs' | 'excludeDirs') => (
    <View style={styles.section}>
      <Text size={14} color={theme['q-text-primary']} style={styles.sectionTitle}>
        {t(key == 'scanDirs' ? 'local_scan_include_dirs' : 'local_scan_exclude_dirs')}
      </Text>
      <Text size={11} color={theme['q-text-secondary']} style={styles.sectionHint}>
        {t(key == 'scanDirs' ? 'local_scan_include_hint' : 'local_scan_exclude_hint')}
      </Text>
      <View style={styles.dirList}>
        {settings[key].length
          ? settings[key].map(path => <View key={path} style={[styles.dirRow, { backgroundColor: theme['q-surface-raised'], borderRadius: 12 }]}>
              <Icon accessible={false} name="folder" rawSize={15} color={theme['q-text-secondary']} />
              <Text size={11} color={theme['q-text-secondary']} numberOfLines={1} style={styles.dirPath}>{path}</Text>
              <Button accessibilityLabel={t('list_remove')} style={styles.dirRemove} onPress={() => { removeDir(key, path) }}>
                <Icon accessible={false} name="close" rawSize={14} color={theme['q-text-secondary']} />
              </Button>
            </View>)
          : <Text size={11} color={theme['q-text-secondary']}>{t('local_scan_no_dirs')}</Text>}
      </View>
      <Button
        style={[styles.addButton, { backgroundColor: theme['q-surface-tint'] }]}
        onPress={() => { openPicker(key == 'scanDirs' ? 'scan' : 'exclude') }}
      >
        <Icon accessible={false} name="add" rawSize={14} color={theme['q-accent-text']} />
        <Text size={12} color={theme['q-accent-text']}>{t('local_scan_add_dir')}</Text>
      </Button>
    </View>
  )

  return <>
    <Modal ref={modalRef} bgColor="rgba(0,0,0,0.42)">
      <View pointerEvents="box-none" style={styles.root}>
        <View style={[styles.sheet, { backgroundColor: theme['c-content-background'], borderColor: theme['q-outline'] }]}>
          <View style={[styles.header, { borderBottomColor: theme['q-outline'] }]}>
            <Text size={17} color={theme['q-text-primary']} style={styles.headerTitle}>{t('local_scan_settings')}</Text>
            <Button accessibilityLabel={t('local_scan_close')} style={styles.close} onPress={() => { modalRef.current?.setVisible(false) }}>
              <Icon accessible={false} name="close" rawSize={18} color={theme['q-text-secondary']} />
            </Button>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
            {dirSection('scanDirs')}
            {dirSection('excludeDirs')}
            <View style={styles.section}>
              <Text size={14} color={theme['q-text-primary']} style={styles.sectionTitle}>{t('local_scan_min_duration')}</Text>
              <View style={styles.segment}>
                {DURATIONS.map(item => {
                  const selected = settings.minDuration == item.value
                  return <Button
                    key={item.value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={[styles.segmentItem, { backgroundColor: selected ? theme['q-surface-tint'] : 'transparent' }]}
                    onPress={() => { update({ minDuration: item.value }) }}
                  >
                    <Text size={12} numberOfLines={1} color={selected ? theme['q-accent-text'] : theme['q-text-secondary']}>{t(item.label)}</Text>
                  </Button>
                })}
              </View>
            </View>
            <View style={[styles.switchRow, { borderBottomColor: theme['q-outline'] }]}>
              <View style={styles.switchInfo}>
                <Text size={14} color={theme['q-text-primary']}>{t('local_scan_skip_system')}</Text>
                <Text size={11} color={theme['q-text-secondary']} style={styles.sectionHint}>{t('local_scan_skip_system_hint')}</Text>
              </View>
              <Switch
                value={settings.skipSystemAudio}
                onValueChange={value => { update({ skipSystemAudio: value }) }}
                trackColor={{ false: theme['q-outline'], true: theme['q-accent'] }}
                thumbColor={settings.skipSystemAudio ? '#ffffff' : theme['q-text-secondary']}
              />
            </View>
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: theme['q-outline'] }]}>
            <Button style={[styles.footerButton, { backgroundColor: theme['q-surface-tint'] }]} onPress={() => { modalRef.current?.setVisible(false) }}>
              <Text size={13} color={theme['q-text-secondary']}>{t('cancel')}</Text>
            </Button>
            <Button style={[styles.footerButton, { backgroundColor: theme['q-accent'] }]} onPress={save}>
              <Text size={13} color={theme['q-on-accent']}>{t('local_scan_save')}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
    <ChoosePath ref={choosePathRef} onConfirm={addDir} />
  </>
})

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '86%', alignSelf: 'center', borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  header: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { flex: 1, fontWeight: '600' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  body: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: 18, paddingBottom: 12 },
  section: { paddingTop: 16, paddingBottom: 6 },
  sectionTitle: { fontWeight: '600' },
  sectionHint: { marginTop: 5, lineHeight: 17 },
  dirList: { gap: 6, marginTop: 10 },
  dirRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingLeft: 12, paddingRight: 4 },
  dirPath: { flex: 1, minWidth: 0 },
  dirRemove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 38, borderRadius: 19, marginTop: 8 },
  segment: { flexDirection: 'row', gap: 6, marginTop: 10 },
  segmentItem: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, paddingHorizontal: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  switchInfo: { flex: 1, minWidth: 0 },
  footer: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: StyleSheet.hairlineWidth },
  footerButton: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
})
