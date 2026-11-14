import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Button from '@/components/common/Button'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'
import { useTheme } from '@/store/theme/hook'
import { useI18n } from '@/lang'
import { useNavActiveId } from '@/store/common/hook'
import { setNavActiveId } from '@/core/common'
import Search from '../Search'
import Leaderboard from '../Leaderboard'

type TabId = 'nav_search' | 'nav_top'

const TABS: ReadonlyArray<{ id: TabId, icon: string, label: 'mobile_search' | 'nav_top' }> = [
  { id: 'nav_search', icon: 'search-2', label: 'mobile_search' },
  { id: 'nav_top', icon: 'leaderboard', label: 'nav_top' },
]

/**
 * 发现页：把原来独立的「排行榜」收进发现页，与「搜索」并列为子标签。
 * 两个子页都保持原有实现不变；首次切到某个子页才挂载，之后保留实例，
 * 避免来回切换时丢失搜索词、榜单加载状态和滚动位置。
 */
export default () => {
  const theme = useTheme()
  const t = useI18n()
  const activeId = useNavActiveId()
  const tab: TabId = activeId == 'nav_top' ? 'nav_top' : 'nav_search'
  const [mounted, setMounted] = useState({ nav_search: tab == 'nav_search', nav_top: tab == 'nav_top' })
  useEffect(() => {
    setMounted(prev => (prev[tab] ? prev : { ...prev, [tab]: true }))
  }, [tab])

  return <View style={styles.container}>
    <View style={[styles.tabBar, { borderBottomColor: theme['q-outline'] }]}>
      {TABS.map(item => {
        const selected = tab == item.id
        return <Button
          key={item.id}
          accessibilityRole="tab"
          accessibilityLabel={t(item.label)}
          accessibilityState={{ selected }}
          style={[styles.tab, selected && { backgroundColor: theme['q-surface-tint'] }]}
          onPress={() => { if (!selected) setNavActiveId(item.id) }}
        >
          <Icon name={item.icon} rawSize={16} color={selected ? theme['q-accent-text'] : theme['q-text-secondary']} />
          <Text size={13} numberOfLines={1} style={styles.tabLabel} color={selected ? theme['q-accent-text'] : theme['q-text-secondary']}>{t(item.label)}</Text>
        </Button>
      })}
    </View>
    <View style={styles.body}>
      {mounted.nav_search ? <View style={[styles.pane, tab != 'nav_search' && styles.paneHidden]}><Search /></View> : null}
      {mounted.nav_top ? <View style={[styles.pane, tab != 'nav_top' && styles.paneHidden]}><Leaderboard /></View> : null}
    </View>
  </View>
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
  },
  tabBar: {
    height: 46,
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    height: 34,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  pane: {
    ...StyleSheet.absoluteFillObject,
  },
  paneHidden: {
    display: 'none',
  },
})
