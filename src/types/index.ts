// Navigation Types
export interface RootStackParamList {
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
}

// Component Props Types
export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export interface CardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onPress?: () => void;
}

// Screen Types
export interface ScreenProps {
  navigation: any;
  route: any;
}

// App State Types
export interface AppState {
  isLoading: boolean;
  user: User | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}


