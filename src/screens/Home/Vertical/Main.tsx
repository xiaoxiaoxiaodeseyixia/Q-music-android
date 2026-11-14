import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { StyleSheet, View } from 'react-native'
import Discover from '../Views/Discover'
import SongList from '../Views/SongList'
import Mylist from '../Views/Mylist'
import LocalMusic from '../Views/LocalMusic'
import Download from '../Views/Download'
import Setting from '../Views/Setting'
import commonState, { type InitState as CommonState } from '@/store/common/state'
import { createStyle } from '@/utils/tools'
import PagerView, { type PageScrollStateChangedNativeEvent, type PagerViewOnPageSelectedEvent } from 'react-native-pager-view'
import { setNavActiveId } from '@/core/common'
import settingState from '@/store/setting/state'
import Header from './Header'
import { useNavActiveId } from '@/store/common/hook'
import { useTheme } from '@/store/theme/hook'
import useAdaptiveLayout from '@/utils/hooks/useAdaptiveLayout'

const hideKeys = [
  'list.isShowAlbumName',
  'list.isShowInterval',
  'theme.fontShadow',
] as Readonly<Array<keyof LX.AppSetting>>

// 排行榜已并入发现页，作为其第二个子标签；nav_top 仍然指向第 0 页。
const DiscoverPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_search' || commonState.navActiveId == 'nav_top')
  const component = useMemo(() => <Discover />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_search' || id == 'nav_top') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some(k => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}
const SongListPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_songlist')
  const component = useMemo(() => <SongList />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_songlist') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some(k => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
  // return activeId == 1 || activeId == 0  ? SongList : null
}
const MylistPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_love')
  const component = useMemo(() => <Mylist />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_love') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some(k => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}
const LocalMusicPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_local_music')
  const component = useMemo(() => <LocalMusic />, [])
  useEffect(() => {
    let currentId: CommonState['navActiveId'] = commonState.navActiveId
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      currentId = id
      if (id == 'nav_local_music') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    const handleHide = () => {
      if (currentId != 'nav_setting') return
      setVisible(false)
    }
    const handleConfigUpdated = (keys: Array<keyof LX.AppSetting>) => {
      if (keys.some(k => hideKeys.includes(k))) handleHide()
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)
    global.state_event.on('themeUpdated', handleHide)
    global.state_event.on('languageChanged', handleHide)
    global.state_event.on('configUpdated', handleConfigUpdated)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
      global.state_event.off('themeUpdated', handleHide)
      global.state_event.off('languageChanged', handleHide)
      global.state_event.off('configUpdated', handleConfigUpdated)
    }
  }, [])

  return visible ? component : null
}
const DownloadPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'download')
  const component = useMemo(() => <Download />, [])
  useEffect(() => {
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      if (id == 'download') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
    }
  }, [])
  return visible ? component : null
}

const SettingPage = () => {
  const [visible, setVisible] = useState(commonState.navActiveId == 'nav_setting')
  const component = useMemo(() => <Setting />, [])
  useEffect(() => {
    const handleNavIdUpdate = (id: CommonState['navActiveId']) => {
      if (id == 'nav_setting') {
        requestAnimationFrame(() => {
          setVisible(true)
        })
      }
    }
    global.state_event.on('navActiveIdUpdated', handleNavIdUpdate)

    return () => {
      global.state_event.off('navActiveIdUpdated', handleNavIdUpdate)
    }
  }, [])
  return visible ? component : null
}

const viewMap = {
  nav_search: 0,
  nav_top: 0, // 排行榜是发现页的子标签，与搜索共用第 0 页
  nav_songlist: 0, // 歌单广场改为发现页「发现更多歌单」模块里的二级页
  nav_local_music: 1,
  nav_love: 2,
  download: 3,
  nav_setting: 4,
}
const indexMap = [
  'nav_search',
  'nav_local_music',
  'nav_love',
] as const
const MAX_PAGE_INDEX = indexMap.length - 1

const Main = () => {
  const { canSwipePages, wide } = useAdaptiveLayout()
  const activeId = useNavActiveId()
  const theme = useTheme()
  const pagerViewRef = useRef<ComponentRef<typeof PagerView>>(null)
  let activeIndexRef = useRef(Math.min(viewMap[commonState.navActiveId], MAX_PAGE_INDEX))
  // const isScrollingRef = useRef(false)
  // const scrollPositionRef = useRef(-1)

  // const handlePageScroll = useCallback(({ nativeEvent }) => {
  //   console.log(nativeEvent.offset, activeIndexRef.current)
  //   // if (activeIndexRef.current == -1) return
  //   // if (nativeEvent.offset == 0) {
  //   //   isScrollingRef.current = false

  //   //   const index = nativeEvent.position
  //   //   if (activeIndexRef.current == index) return
  //   //   activeIndexRef.current = index
  //   //   setNavActiveIndex(index)
  //   // } else if (!isScrollingRef.current) {
  //   //   isScrollingRef.current = true
  //   // }
  // }, [setNavActiveIndex])

  const onPageSelected = useCallback(({ nativeEvent }: PagerViewOnPageSelectedEvent) => {
    if (commonState.navActiveId == 'download' || commonState.navActiveId == 'nav_setting' || commonState.navActiveId == 'nav_songlist') return
    // console.log(nativeEvent)
    activeIndexRef.current = nativeEvent.position
    if (activeIndexRef.current != viewMap[commonState.navActiveId]) {
      setNavActiveId(indexMap[activeIndexRef.current])
    }
  }, [])

  const onPageScrollStateChanged = useCallback(({ nativeEvent }: PageScrollStateChangedNativeEvent) => {
    // console.log(nativeEvent)
    const idle = nativeEvent.pageScrollState == 'idle'
    if (global.lx.homePagerIdle != idle) global.lx.homePagerIdle = idle
    // if (nativeEvent.pageScrollState != 'idle') return
    // if (scrollPositionRef.current != commonState.navActiveIndex) {
    //   setNavActiveIndex(scrollPositionRef.current)
    // }
    // if (activeIndexRef.current == -1) return
    // if (nativeEvent.offset == 0) {
    //   isScrollingRef.current = false

    //   const index = nativeEvent.position
    //   if (activeIndexRef.current == index) return
    //   activeIndexRef.current = index
    //   setNavActiveIndex(index)
    // } else if (!isScrollingRef.current) {
    //   isScrollingRef.current = true
    // }
  }, [])

  useEffect(() => {
    const handleUpdate = (id: CommonState['navActiveId']) => {
      const index = viewMap[id]
      if (index > MAX_PAGE_INDEX) return
      if (activeIndexRef.current == index) return
      activeIndexRef.current = index
      pagerViewRef.current?.setPageWithoutAnimation(index)
    }
    const handleConfigUpdate = (keys: Array<keyof LX.AppSetting>, setting: Partial<LX.AppSetting>) => {
      if (!keys.includes('common.homePageScroll')) return
      pagerViewRef.current?.setScrollEnabled(canSwipePages && setting['common.homePageScroll']!)
    }
    // window.requestAnimationFrame(() => pagerViewRef.current && pagerViewRef.current.setPage(activeIndexRef.current))
    global.state_event.on('navActiveIdUpdated', handleUpdate)
    global.state_event.on('configUpdated', handleConfigUpdate)
    return () => {
      global.state_event.off('navActiveIdUpdated', handleUpdate)
      global.state_event.off('configUpdated', handleConfigUpdate)
    }
  }, [canSwipePages])


  const component = useMemo(() => (
    <PagerView ref={pagerViewRef}
      initialPage={activeIndexRef.current}
      // onPageScroll={handlePageScroll}
      offscreenPageLimit={1}
      onPageSelected={onPageSelected}
      onPageScrollStateChanged={onPageScrollStateChanged}
      scrollEnabled={canSwipePages && settingState.setting['common.homePageScroll']}
      style={styles.pagerView}
    >
      <View collapsable={false} key="nav_search" style={styles.pageStyle}>
        <DiscoverPage />
      </View>
      <View collapsable={false} key="nav_local_music" style={styles.pageStyle}>
        <Header />
        <LocalMusicPage />
      </View>
      <View collapsable={false} key="nav_love" style={styles.pageStyle}>
        <Header />
        <MylistPage />
      </View>
      {/* <View collapsable={false} key="nav_search" style={styles.pageStyle}>
        <Search />
      </View>
      <View collapsable={false} key="nav_songlist" style={styles.pageStyle}>
        <SongList />
      </View>
      <View collapsable={false} key="nav_top" style={styles.pageStyle}>
        <Leaderboard />
      </View>
      <View collapsable={false} key="nav_love" style={styles.pageStyle}>
        <Mylist />
      </View>
      <View collapsable={false} key="nav_setting" style={styles.pageStyle}>
        <Setting />
      </View> */}
    </PagerView>
  ), [onPageScrollStateChanged, onPageSelected, canSwipePages])

  const secondary = activeId == 'download' || activeId == 'nav_setting' || activeId == 'nav_songlist'
  return <View style={styles.pageStyle}>
    <View collapsable={false} style={styles.pageStyle} pointerEvents={secondary ? 'none' : 'auto'} accessibilityElementsHidden={secondary} importantForAccessibility={secondary ? 'no-hide-descendants' : 'auto'}>{component}</View>
    {secondary ? <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme['c-content-background'] }}>
      {activeId == 'download' || activeId == 'nav_songlist' || wide ? <Header /> : null}
      {activeId == 'download' ? <DownloadPage /> : activeId == 'nav_songlist' ? <SongListPage /> : <SettingPage />}
    </View> : null}
  </View>
}

const styles = createStyle({
  pagerView: {
    flex: 1,
    overflow: 'hidden',
  },
  pageStyle: {
    flex: 1,
  },
})


export default Main

