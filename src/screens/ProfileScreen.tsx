import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Card } from '@/components/common';

const ProfileScreen = memo(() => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>
            Manage your account and preferences
          </Text>
        </View>

        <View style={styles.section}>
          <Card
            title="User Information"
            subtitle="Your account details"
            style={styles.card}
          >
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>John Doe</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>john.doe@example.com</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Member Since:</Text>
              <Text style={styles.value}>January 2024</Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Card
            title="Statistics"
            subtitle="Your activity summary"
            style={styles.card}
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>42</Text>
                <Text style={styles.statLabel}>Projects</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>156</Text>
                <Text style={styles.statLabel}>Tasks</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>89%</Text>
                <Text style={styles.statLabel}>Completion</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.screenPadding,
  },
  header: {
    marginBottom: Spacing.sectionSpacing,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    lineHeight: 24,
  },
  section: {
    marginBottom: Spacing.sectionSpacing,
  },
  card: {
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  label: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
});

ProfileScreen.displayName = 'ProfileScreen';

export default ProfileScreen;


