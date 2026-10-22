import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '../design/tokens';
import { useT } from '../i18n';
import Svg, { Path, Circle } from 'react-native-svg';

export type NavTab = 'home' | 'servers' | 'ai' | 'activity' | 'profile' | 'game' | 'chats' | 'wallet' | 'clan' | 'calls';

type NavItem = { key: NavTab };

// Messenger-first navigation, kept in the same order in every language.
const TABS: NavItem[] = [
  { key: 'chats' },
  { key: 'calls' },
  { key: 'servers' },
  { key: 'clan' },
  { key: 'profile' },
];

interface Props {
  active:   NavTab;
  onPress:  (tab: NavTab) => void;
}

export function BottomNav({ active, onPress }: Props) {
  const { t, isRTL } = useT();
  const insets = useSafeAreaInsets();

  const LABELS: Record<NavTab, Parameters<typeof t>[0]> = {
    home:     'nav.home',
    servers:  'ms.connection',
    ai:       'nav.ai',
    activity: 'nav.activity',
    profile:  'nav.profile',
    game:     'nav.game',
    chats:    'nav.chats',
    wallet:   'nav.wallet',
    clan:     'nav.clan',
    calls:    'nav.calls',
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + Spacing[2] }]}>
      <View style={[styles.bar, isRTL && { flexDirection: 'row-reverse' }]}>
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="tab"
              accessibilityLabel={t(LABELS[tab.key])}
              accessibilityState={{ selected: isActive }}
              style={styles.tab}
              onPress={() => onPress(tab.key)}
              activeOpacity={0.7}
            >
              <NavIcon tab={tab.key} active={isActive} />
              <Text style={[styles.label, isActive && styles.labelActive]}>{t(LABELS[tab.key])}</Text>
              {isActive && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function NavIcon({ tab, active }: { tab: NavTab; active: boolean }) {
  const color = active ? Colors.blue[400] : Colors.text.muted;
  const paths: Partial<Record<NavTab, string>> = {
    chats: 'M21 11a8 8 0 0 1-8 8H7l-4 3V11a9 9 0 0 1 18 0ZM7 9h10M7 13h6',
    calls: 'M7 3H4c-1 0-2 1-2 2 0 9 8 17 17 17 1 0 2-1 2-2v-3l-5-2-2 2c-3-1-5-3-6-6l2-2-3-6Z',
    servers: 'M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18',
    clan: 'M3 21v-2c0-3 2-5 5-5h2c3 0 5 2 5 5v2M17 14c3 0 5 2 5 5v2',
    profile: 'M4 21v-2a8 8 0 0 1 16 0v2',
  };
  return <Svg width={23} height={23} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    {tab === 'servers' && <Circle cx={12} cy={12} r={9} />}
    {tab === 'profile' && <Circle cx={12} cy={6} r={4} />}
    {tab === 'clan' && <><Circle cx={9} cy={6} r={4} /><Path d="M17 3a4 4 0 0 1 0 8" /></>}
    <Path d={paths[tab] ?? ''} />
  </Svg>;
}

// Static height used by screens to add bottom padding
BottomNav.BAR_HEIGHT = 56;
// Single source of truth for the nav's total on-screen height, excluding the
// safe-area inset (callers add insets.bottom themselves, since it varies by
// device/orientation). Derived from the same Spacing[2]/BAR_HEIGHT/Spacing[2]
// (paddingTop + bar + paddingBottom's non-inset part) that `container`/`bar`
// below actually render with, so it can't drift the way the old, separately
// hand-maintained `Layout.bottomNavHeight` constant did.
BottomNav.CONTENT_HEIGHT = Spacing[2] + BottomNav.BAR_HEIGHT + Spacing[2];

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    backgroundColor: Colors.bg.void,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.elevated,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing[4],
    height: BottomNav.BAR_HEIGHT,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  // Active-tab color: gold (theme pkg 2026-07-23) — was emerald. This is
  // the app's single active-nav choke point, on purpose (see A->B(74)).
  icon:        { fontSize: 19, color: Colors.text.muted },
  iconActive:  { color: Colors.blue[400] },
  label:       { fontSize: 9, fontFamily: Typography.family.label, color: Colors.text.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  labelActive: { color: Colors.blue[400] },
  dot:         { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.blue[400], position: 'absolute', bottom: -4 },
});
