import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
  disabled?: boolean;
}

export interface CustomAlertProps {
  visible: boolean;
  title?: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  buttons?: AlertButton[];
  onDismiss?: () => void;
  showCloseButton?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  customIcon?: React.ReactNode;
  animationType?: 'fade' | 'slide' | 'scale';
  backgroundColor?: string;
  overlayColor?: string;
  borderRadius?: number;
  maxWidth?: number;
  showIcon?: boolean;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  buttons = [],
  onDismiss,
  showCloseButton = true,
  icon,
  customIcon,
  animationType = 'scale',
  backgroundColor,
  overlayColor = 'rgba(0, 0, 0, 0.5)',
  borderRadius = 16,
  maxWidth = screenWidth * 0.85,
  showIcon = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      StatusBar.setBarStyle('light-content', true);
      
      if (animationType === 'scale') {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (animationType === 'fade') {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (animationType === 'slide') {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      StatusBar.setBarStyle('dark-content', true);
      
      if (animationType === 'scale') {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (animationType === 'fade') {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else if (animationType === 'slide') {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 50,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible, animationType, scaleAnim, fadeAnim, slideAnim]);

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: icon || 'checkmark-circle',
          iconColor: '#10B981',
          backgroundColor: backgroundColor || '#FFFFFF',
          borderColor: '#D1FAE5',
          titleColor: '#065F46',
        };
      case 'error':
        return {
          icon: icon || 'close-circle',
          iconColor: '#EF4444',
          backgroundColor: backgroundColor || '#FFFFFF',
          borderColor: '#FEE2E2',
          titleColor: '#991B1B',
        };
      case 'warning':
        return {
          icon: icon || 'warning',
          iconColor: '#F59E0B',
          backgroundColor: backgroundColor || '#FFFFFF',
          borderColor: '#FEF3C7',
          titleColor: '#92400E',
        };
      case 'confirm':
        return {
          icon: icon || 'help-circle',
          iconColor: '#3B82F6',
          backgroundColor: backgroundColor || '#FFFFFF',
          borderColor: '#DBEAFE',
          titleColor: '#1E40AF',
        };
      default: // info
        return {
          icon: icon || 'information-circle',
          iconColor: '#3B82F6',
          backgroundColor: backgroundColor || '#FFFFFF',
          borderColor: '#DBEAFE',
          titleColor: '#1E40AF',
        };
    }
  };

  const typeConfig = getTypeConfig();

  const handleBackdropPress = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  const getButtonStyle = (buttonStyle?: string) => {
    switch (buttonStyle) {
      case 'destructive':
        return styles.destructiveButton;
      case 'cancel':
        return styles.cancelButton;
      default:
        return styles.defaultButton;
    }
  };

  const getButtonTextStyle = (buttonStyle?: string) => {
    switch (buttonStyle) {
      case 'destructive':
        return styles.destructiveButtonText;
      case 'cancel':
        return styles.cancelButtonText;
      default:
        return styles.defaultButtonText;
    }
  };

  const renderContent = () => (
    <View style={[styles.alertContainer, { maxWidth, borderRadius }]}>
      {/* Header with close button */}
      {showCloseButton && (
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}

      {/* Icon */}
      {showIcon && (
        <View style={styles.iconContainer}>
          {customIcon ? (
            customIcon
          ) : (
            <Ionicons
              name={typeConfig.icon as keyof typeof Ionicons.glyphMap}
              size={48}
              color={typeConfig.iconColor}
            />
          )}
        </View>
      )}

      {/* Title */}
      {title && (
        <Text style={[styles.title, { color: typeConfig.titleColor }]}>
          {title}
        </Text>
      )}

      {/* Message */}
      {message && (
        <Text style={styles.message}>
          {message}
        </Text>
      )}

      {/* Buttons */}
      {buttons.length > 0 && (
        <View style={styles.buttonContainer}>
          {buttons.map((button, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.button,
                getButtonStyle(button.style),
                button.disabled && styles.disabledButton,
                buttons.length === 1 && styles.singleButton,
                buttons.length === 2 && styles.halfButton,
                buttons.length > 2 && styles.multipleButton,
              ]}
              onPress={() => handleButtonPress(button)}
              disabled={button.disabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.buttonText,
                  getButtonTextStyle(button.style),
                  button.disabled && styles.disabledButtonText,
                ]}
              >
                {button.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View
          style={[
            styles.overlay,
            {
              backgroundColor: overlayColor,
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.contentContainer,
                {
                  transform: [
                    {
                      scale: animationType === 'scale' ? scaleAnim : 1,
                    },
                    {
                      translateY: animationType === 'slide' ? slideAnim : 0,
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.alertBackground,
                  {
                    backgroundColor: typeConfig.backgroundColor,
                    borderColor: typeConfig.borderColor,
                    borderRadius,
                  },
                ]}
              >
                {renderContent()}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  alertBackground: {
    width: '100%',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  alertContainer: {
    padding: 24,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: -8,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  singleButton: {
    width: '100%',
  },
  halfButton: {
    flex: 1,
    minWidth: 120,
  },
  multipleButton: {
    width: '100%',
  },
  defaultButton: {
    backgroundColor: '#3B82F6',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  destructiveButton: {
    backgroundColor: '#EF4444',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultButtonText: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#374151',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
});

export default CustomAlert;
