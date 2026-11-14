import { memo, useEffect, useRef, useState } from 'react'
import { Animated, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native'
import { setNavActiveId } from '@/core/common'
import { useI18n, type Message } from '@/lang'
import type { NAV_ID_Type } from '@/config/constant'
import { useNavActiveId } from '@/store/common/hook'
import { Icon } from '@/components/common/Icon'
import Text from '@/components/common/Text'
import GlassSurface, { useGlassColors } from '@/components/common/GlassSurface'
import { useMotion } from '@/utils/useMotion'
import useAdaptiveLayout from '@/utils/hooks/useAdaptiveLayout'
import { Q_UI } from '@/theme/ui'

interface NavItemConfig {
  id: NAV_ID_Type
  icon: string
  label: keyof Message
}

const BASE_NAV: readonly NavItemConfig[] = [
  { id: 'nav_search', icon: 'search-2', label: 'mobile_discover' },
  { id: 'nav_songlist', icon: 'album', label: 'nav_songlist' },
  { id: 'nav_top', icon: 'leaderboard', label: 'nav_top' },
  { id: 'nav_love', icon: 'user', label: 'mobile_library' },
]

// Android 底栏：排行榜收进「发现」子标签、歌单并入「发现更多歌单」模块，
// 两个独立项移除，只保留 发现 / 本地音乐 / 我的。其他平台维持官方原有的四项不变。
export const MOBILE_NAV: readonly NavItemConfig[] = Platform.OS == 'android'
  ? [BASE_NAV[0], { id: 'nav_local_music', icon: 'folder', label: 'nav_local_music' }, BASE_NAV[3]]
  : BASE_NAV

// 已并入发现页的二级入口（排行榜子标签、歌单广场）在底栏高亮时统一归到「发现」；
// 底栏仍保留该项的平台维持原样。
export const resolveNavActiveId = (id: NAV_ID_Type): NAV_ID_Type =>
  (id == 'nav_top' || id == 'nav_songlist') && !MOBILE_NAV.some(item => item.id == id) ? 'nav_search' : id

const NavItem = ({ id, icon, label }: NavItemConfig) => {
  const activeId = useNavActiveId()
  const { isCar } = useAdaptiveLayout()
  const colors = useGlassColors()
  const t = useI18n()
  const active = resolveNavActiveId(activeId) == id || (id == 'nav_love' && (activeId == 'download' || activeId == 'nav_setting'))
  const motion = useMotion()
  const scale = useRef(new Animated.Value(1)).current
  const selectedScale = useRef(new Animated.Value(active ? 1.07 : 1)).current
  useEffect(() => {
    if (!motion) { scale.stopAnimation(); scale.setValue(1) }
    return () => { scale.stopAnimation() }
  }, [motion, scale])
  useEffect(() => {
    selectedScale.stopAnimation()
    if (motion) Animated.spring(selectedScale, { toValue: active ? 1.07 : 1, stiffness: 280, damping: 25, useNativeDriver: true }).start()
    else selectedScale.setValue(active ? 1.07 : 1)
    return () => { selectedScale.stopAnimation() }
  }, [active, motion, selectedScale])
  const press = (pressed: boolean) => {
    scale.stopAnimation()
    if (!motion) scale.setValue(1)
    else Animated.spring(scale, { toValue: pressed ? 0.91 : 1, ...Q_UI.motion.press, useNativeDriver: true }).start()
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={t(label)}
      accessibilityState={{ selected: active }}
      style={[styles.touchTarget, isCar && { minHeight: 64 }]}
      onPressIn={() => { press(true) }}
      onPressOut={() => { press(false) }}
      onPress={() => {
        Keyboard.dismiss()
        setNavActiveId(id)
      }}
    >
      <Animated.View style={[styles.item, { transform: [{ scale: Animated.multiply(scale, selectedScale) }] }]}>
        <View style={styles.iconFace}>
          <Icon
            accessible={false}
            name={icon}
            rawSize={isCar ? 25 : 20}
            color={active ? colors.active : colors.secondary}
          />
        </View>
        <Text
          style={styles.label}
          size={isCar ? 14 : 10}
          color={active ? colors.active : colors.secondary}
          numberOfLines={1}
        >
          {t(label)}
        </Text>
      </Animated.View>
    </Pressable>
  )
}

export default memo(() => {
  const activeId = useNavActiveId()
  const { isCar } = useAdaptiveLayout()
  const motion = useMotion()
  const [width, setWidth] = useState(0)
  const lastLayout = useRef(0)
  const previousIndex = useRef(0)
  const leftEdge = useRef(new Animated.Value(0)).current
  const rightEdge = useRef(new Animated.Value(0)).current
  const cellWidth = Math.max(0, (width - 12) / MOBILE_NAV.length)
  const pillWidth = Math.max(0, cellWidth - 4)
  const index = Math.max(0, MOBILE_NAV.findIndex(item => item.id == resolveNavActiveId(activeId) || (item.id == 'nav_love' && (activeId == 'download' || activeId == 'nav_setting'))))
  const span = Animated.subtract(rightEdge, leftEdge)
  useEffect(() => {
    const target = 8 + cellWidth * index
    const movingRight = index >= previousIndex.current
    leftEdge.stopAnimation()
    rightEdge.stopAnimation()
    if (!motion || lastLayout.current != width) {
      leftEdge.setValue(target)
      rightEdge.setValue(target + pillWidth)
    } else {
      // 两端以不同速度追随目标，跨越时拉伸，抵达后自然收拢。
      const leading = { stiffness: 390, damping: 27, mass: 0.72, useNativeDriver: true }
      const trailing = { stiffness: 205, damping: 23, mass: 0.82, useNativeDriver: true }
      Animated.parallel([
        Animated.spring(leftEdge, { toValue: target, ...(movingRight ? trailing : leading) }),
        Animated.spring(rightEdge, { toValue: target + pillWidth, ...(movingRight ? leading : trailing) }),
      ]).start()
    }
    lastLayout.current = width
    previousIndex.current = index
    return () => { leftEdge.stopAnimation(); rightEdge.stopAnimation() }
  }, [cellWidth, index, leftEdge, motion, pillWidth, rightEdge, width])

  return (
    <GlassSurface
      selection
      radius={Q_UI.radius.dock}
      onLayout={event => { setWidth(event.nativeEvent.layout.width) }}
      style={[styles.container, isCar && { minHeight: 72 }]}
    >
      {pillWidth > 0 ? <Animated.View nativeID="qmusic-glass-selection" collapsable={false} pointerEvents="none" style={[styles.activePill, {
        width: pillWidth,
        transform: [
          { translateX: Animated.divide(Animated.subtract(Animated.add(leftEdge, rightEdge), pillWidth), 2) },
          { scaleX: span.interpolate({ inputRange: [0, pillWidth, pillWidth * 1.6], outputRange: [0.9, 1, 1.24], extrapolate: 'clamp' }) },
          { scaleY: span.interpolate({ inputRange: [0, pillWidth, pillWidth * 1.6], outputRange: [1, 1, 0.98], extrapolate: 'clamp' }) },
        ],
      }]} /> : null}
      {MOBILE_NAV.map(item => <NavItem key={item.id} {...item} />)}
    </GlassSurface>
  )
})

const styles = StyleSheet.create({
  activePill: { position: 'absolute', left: 0, top: 4, bottom: 4, borderRadius: 26 },
  container: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginHorizontal: 14,
    marginBottom: 8,
  },
  touchTarget: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  item: {
    width: '100%',
    maxWidth: 96,
    minHeight: 48,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFace: {
    width: 42,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    width: '100%',
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '500',
  },
})
