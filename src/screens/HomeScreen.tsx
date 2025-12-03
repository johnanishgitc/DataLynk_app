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
import { Button, Card } from '@/components/common';

const HomeScreen = memo(() => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to TallyCatalyst</Text>
          <Text style={styles.subtitle}>
            Your mobile app for efficient data management
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.buttonContainer}>
            <Button
              title="Get Started"
              onPress={() => {}}
              variant="primary"
              style={styles.button}
            />
            <Button
              title="Learn More"
              onPress={() => {}}
              variant="outline"
              style={styles.button}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Card
            title="Sample Card"
            subtitle="This is a sample card component"
            style={styles.card}
          >
            <Text style={styles.cardText}>
              This demonstrates the reusable Card component with consistent styling.
            </Text>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureGrid}>
            <Card
              title="Performance"
              subtitle="Optimized for speed"
              variant="elevated"
              style={styles.featureCard}
            >
              <Text style={styles.featureText}>
                Built with performance in mind
              </Text>
            </Card>
            <Card
              title="Responsive"
              subtitle="Works on all devices"
              variant="elevated"
              style={styles.featureCard}
            >
              <Text style={styles.featureText}>
                Adapts to different screen sizes
              </Text>
            </Card>
          </View>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  featureGrid: {
    gap: Spacing.md,
  },
  featureCard: {
    marginBottom: Spacing.md,
  },
  featureText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
});

HomeScreen.displayName = 'HomeScreen';

export default HomeScreen;


