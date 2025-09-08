import { useState, useCallback } from 'react';
import { AlertButton } from '../components/CustomAlert';

export interface AlertOptions {
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  buttons?: AlertButton[];
  showCloseButton?: boolean;
  icon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  customIcon?: React.ReactNode;
  animationType?: 'fade' | 'slide' | 'scale';
  backgroundColor?: string;
  overlayColor?: string;
  borderRadius?: number;
  maxWidth?: number;
  showIcon?: boolean;
}

export const useCustomAlert = () => {
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    options: AlertOptions;
  }>({
    visible: false,
    options: {},
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      visible: true,
      options,
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // Convenience methods for common alert types
  const showSuccess = useCallback((title: string, message?: string, onPress?: () => void) => {
    showAlert({
      title,
      message,
      type: 'success',
      buttons: onPress ? [{ text: 'OK', onPress }] : [{ text: 'OK' }],
    });
  }, [showAlert]);

  const showError = useCallback((title: string, message?: string, onPress?: () => void) => {
    showAlert({
      title,
      message,
      type: 'error',
      buttons: onPress ? [{ text: 'OK', onPress }] : [{ text: 'OK' }],
    });
  }, [showAlert]);

  const showWarning = useCallback((title: string, message?: string, onPress?: () => void) => {
    showAlert({
      title,
      message,
      type: 'warning',
      buttons: onPress ? [{ text: 'OK', onPress }] : [{ text: 'OK' }],
    });
  }, [showAlert]);

  const showInfo = useCallback((title: string, message?: string, onPress?: () => void) => {
    showAlert({
      title,
      message,
      type: 'info',
      buttons: onPress ? [{ text: 'OK', onPress }] : [{ text: 'OK' }],
    });
  }, [showAlert]);

  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = 'Confirm',
    cancelText: string = 'Cancel'
  ) => {
    showAlert({
      title,
      message,
      type: 'confirm',
      buttons: [
        {
          text: cancelText,
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: confirmText,
          style: 'destructive',
          onPress: onConfirm,
        },
      ],
    });
  }, [showAlert]);

  return {
    alertState,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
  };
};
