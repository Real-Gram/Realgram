/** A contact’s public messenger identity, independent of player statistics. */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing, Typography } from '../design/tokens';
import { useT } from '../i18n';
import { getPeerProfile, PeerProfile } from '../services/ecosystemProfileService';

interface Props {
  visible:      boolean;
  peerDeviceId: string;
  onClose:      () => void;
}

export function PeerProfileSheet({ visible, peerDeviceId, onClose }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PeerProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !peerDeviceId) return;
    setLoading(true);
    setProfile(null);
    let current = true;
    getPeerProfile(peerDeviceId).then((p) => { if (current) { setProfile(p); setLoading(false); } });
    return () => { current = false; };
  }, [visible, peerDeviceId]);

  const displayName = profile?.display_name || profile?.handle || profile?.user_id || '';
  const hasHandle    = !!(profile?.handle || profile?.display_name);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing[5] }]}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={Colors.blue[400]} />
            </View>
          ) : (
            <>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: profile?.avatar_color || Colors.bg.elevated },
                ]}
              >
                <Text style={styles.avatarText}>
                  {profile?.avatar_emoji || displayName.slice(0, 1).toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {displayName || t('inbox.peerProfileUnknown')}
              </Text>
              {hasHandle && profile?.handle && (
                <Text style={styles.handle}>@{profile.handle}</Text>
              )}
              {!hasHandle && (
                <Text style={styles.emptyHint}>{t('inbox.peerProfileEmpty')}</Text>
              )}
            </>
          )}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.85}>
            <Text style={styles.closeBtnText}>{t('heroes.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,6,9,0.65)' },
  sheet: {
    backgroundColor: Colors.bg.base, borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'],
    padding: Spacing[5], alignItems: 'center', gap: Spacing[2],
  },
  loadingWrap: { paddingVertical: Spacing[8] },
  avatar: {
    width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.blue[400], marginBottom: Spacing[2],
  },
  avatarText: { fontSize: 28, fontFamily: Typography.family.heading, color: Colors.blue[400] },
  name:   { fontSize: 18, fontFamily: Typography.family.heading, color: Colors.text.primary },
  handle: { fontSize: 13, fontFamily: Typography.family.mono, color: Colors.text.muted },
  levelLine: { fontSize: 13, fontFamily: Typography.family.mono, color: Colors.blue[400] },
  card:   { width: '100%', marginTop: Spacing[3], gap: Spacing[1] },
  cardLabel: { fontSize: 11, fontFamily: Typography.family.label, color: Colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 14, fontFamily: Typography.family.body, color: Colors.text.primary },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chapterCount: { fontSize: 12, fontFamily: Typography.family.mono, color: Colors.text.secondary },
  progressTrack: {
    height: 6, borderRadius: Radius.full, backgroundColor: Colors.bg.elevated,
    overflow: 'hidden', marginTop: Spacing[1],
  },
  progressFill: { height: '100%', backgroundColor: Colors.blue[400], borderRadius: Radius.full },
  emptyText: { fontSize: 13, fontFamily: Typography.family.body, color: Colors.text.muted },
  clanRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  clanPhoto: { width: 44, height: 44, borderRadius: Radius.md },
  clanPhotoFallback: { backgroundColor: Colors.bg.elevated, alignItems: 'center', justifyContent: 'center' },
  clanPhotoText: { fontSize: 18, fontFamily: Typography.family.heading, color: Colors.blue[400] },
  clanName: { fontSize: 14, fontFamily: Typography.family.heading, color: Colors.text.primary },
  clanMeta: { fontSize: 12, fontFamily: Typography.family.body, color: Colors.text.secondary },
  emptyHint: { fontSize: 12, fontFamily: Typography.family.body, color: Colors.text.muted, marginTop: Spacing[3], textAlign: 'center' },
  closeBtn:  { marginTop: Spacing[4], alignItems: 'center', paddingVertical: Spacing[2], width: '100%' },
  closeBtnText: { fontSize: 13, fontFamily: Typography.family.body, color: Colors.text.muted },
});
