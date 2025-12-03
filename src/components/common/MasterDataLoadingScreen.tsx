import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';

interface MasterDataLoadingScreenProps {
  companyName: string;
  progress?: number;
  currentStep?: number; // 1-6 for the 6 steps
  stepInfo?: string; // Additional info for current step
}

export const MasterDataLoadingScreen: React.FC<MasterDataLoadingScreenProps> = ({
  companyName,
  progress = 0,
  currentStep = 1,
  stepInfo = '',
}) => {
  // Timer state
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const startTime = React.useRef(Date.now());

  // Animation for the loading indicator
  const spinValue = React.useRef(new Animated.Value(0)).current;

  // Timer effect - update elapsed time every second
  React.useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Animation effect
  React.useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => spin());
    };
    spin();
  }, [spinValue]);

  const spinAnimation = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Format elapsed time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Define the 6 steps
  const steps = [
    {
      number: 1,
      title: 'Fetching Items',
      description: 'Getting stock items from Tally...',
      icon: '📦'
    },
    {
      number: 2,
      title: 'Processing Items',
      description: 'Decrypting prices and validating data...',
      icon: '🔧'
    },
    {
      number: 3,
      title: 'Fetching Customers',
      description: 'Getting customer data from Tally...',
      icon: '👥'
    },
    {
      number: 4,
      title: 'Processing Customers',
      description: 'Formatting addresses and finalizing data...',
      icon: '🔧'
    },
    {
      number: 5,
      title: 'Fetching Voucher Types',
      description: 'Getting voucher types from Tally...',
      icon: '📋'
    },
    {
      number: 6,
      title: 'Processing Voucher Types',
      description: 'Processing voucher types...',
      icon: '🔧'
    }
  ];

  const currentStepData = steps[currentStep - 1] || steps[0];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Company Name */}
        <Text style={styles.companyName}>{companyName}</Text>
        
        {/* Loading Animation */}
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingCircle,
              { transform: [{ rotate: spinAnimation }] },
            ]}
          >
            <View style={styles.innerCircle}>
              <Text style={styles.loadingText}>📦</Text>
            </View>
          </Animated.View>
        </View>

        {/* Loading Text */}
        <Text style={styles.loadingTitle}>Loading Masters</Text>
        <Text style={styles.loadingSubtitle}>
          {currentStepData.description}
        </Text>
        
        {/* Current Step Info */}
        <View style={styles.stepInfoContainer}>
          <Text style={styles.stepNumber}>Step {currentStepData.number} of 4</Text>
          <Text style={styles.stepTitle}>{currentStepData.title}</Text>
          {stepInfo && (
            <Text style={styles.stepDetails}>{stepInfo}</Text>
          )}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(progress, 10)}%` },
              ]}
            />
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {Math.round(progress)}%
            </Text>
            <Text style={styles.timerText}>
              ⏱️ {formatTime(elapsedTime)}
            </Text>
          </View>
        </View>

        {/* Loading Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.number} style={styles.step}>
              <View style={[
                styles.stepIconContainer,
                currentStep >= step.number ? styles.stepIconActive : styles.stepIconInactive
              ]}>
                <Text style={[
                  styles.stepIcon,
                  currentStep >= step.number ? styles.stepIconTextActive : styles.stepIconTextInactive
                ]}>
                  {currentStep >= step.number ? step.icon : '⏳'}
                </Text>
              </View>
              <Text style={[
                styles.stepText,
                currentStep >= step.number ? styles.stepTextActive : styles.stepTextInactive
              ]}>
                {step.title}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  loadingContainer: {
    marginBottom: Spacing.xl,
  },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: Colors.primary,
    borderTopColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  stepInfoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  stepNumber: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  stepTitle: {
    fontSize: 18,
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  stepDetails: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  progressContainer: {
    width: '100%',
    marginBottom: Spacing.xl,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  progressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  timerText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: Spacing.sm,
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stepIconActive: {
    backgroundColor: Colors.primary,
  },
  stepIconInactive: {
    backgroundColor: Colors.gray[200],
  },
  stepIcon: {
    fontSize: 16,
  },
  stepIconTextActive: {
    color: Colors.white,
  },
  stepIconTextInactive: {
    color: Colors.gray[500],
  },
  stepText: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepTextActive: {
    color: Colors.text.primary,
  },
  stepTextInactive: {
    color: Colors.text.secondary,
  },
});
