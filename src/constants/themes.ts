export const themes = {
  colors: {
    background: '#130409',
    primary: '#007AFF',
    secondary: '#F8F9FA',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    border: '#E9ECEF',
    card: '#4A524C',
    success: '#28A745',
    error: '#DC3545',
    warning: '#FFC107',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export type Theme = typeof themes;
