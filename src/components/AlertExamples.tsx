import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useCustomAlert } from '../hooks/useCustomAlert';
import CustomAlert from './CustomAlert';

const AlertExamples: React.FC = () => {
  const { alertState, showSuccess, showError, showWarning, showInfo, showConfirm, showAlert, hideAlert } = useCustomAlert();

  const handleSuccessAlert = () => {
    showSuccess('Profile Updated!', 'Your profile has been successfully updated with all the latest information.');
  };

  const handleErrorAlert = () => {
    showError('Connection Failed', 'Unable to connect to the server. Please check your internet connection and try again.');
  };

  const handleWarningAlert = () => {
    showWarning('Storage Almost Full', 'You are using 90% of your available storage. Consider cleaning up some files.');
  };

  const handleInfoAlert = () => {
    showInfo('New Feature Available', 'We have added a new dark mode feature. You can enable it in your settings.');
  };

  const handleConfirmAlert = () => {
    showConfirm(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      () => {
        // Simulate account deletion
        console.log('Account deleted');
        showSuccess('Account Deleted', 'Your account has been successfully deleted.');
      },
      () => {
        console.log('Deletion cancelled');
      },
      'Delete',
      'Cancel'
    );
  };

  const handleCustomAlert = () => {
    showAlert({
      title: 'Custom Alert',
      message: 'This is a custom alert with multiple buttons and custom styling.',
      type: 'info',
      buttons: [
        {
          text: 'Option 1',
          onPress: () => console.log('Option 1 pressed'),
        },
        {
          text: 'Option 2',
          onPress: () => console.log('Option 2 pressed'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => console.log('Cancelled'),
        },
      ],
      animationType: 'slide',
      backgroundColor: '#F8FAFC',
      borderRadius: 20,
    });
  };

  const handleAnimatedAlert = () => {
    showAlert({
      title: 'Animated Alert',
      message: 'This alert uses a fade animation with custom colors.',
      type: 'success',
      animationType: 'fade',
      overlayColor: 'rgba(0, 0, 0, 0.7)',
      backgroundColor: '#ECFDF5',
      buttons: [{ text: 'Got it!' }],
    });
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Custom Alert Examples</Text>
        <Text style={styles.subtitle}>Tap any button to see different alert types</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.successButton]} onPress={handleSuccessAlert}>
            <Text style={styles.buttonText}>Success Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.errorButton]} onPress={handleErrorAlert}>
            <Text style={styles.buttonText}>Error Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.warningButton]} onPress={handleWarningAlert}>
            <Text style={styles.buttonText}>Warning Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.infoButton]} onPress={handleInfoAlert}>
            <Text style={styles.buttonText}>Info Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={handleConfirmAlert}>
            <Text style={styles.buttonText}>Confirm Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.customButton]} onPress={handleCustomAlert}>
            <Text style={styles.buttonText}>Custom Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.animatedButton]} onPress={handleAnimatedAlert}>
            <Text style={styles.buttonText}>Animated Alert</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertState.visible}
        title={alertState.options.title}
        message={alertState.options.message}
        type={alertState.options.type}
        buttons={alertState.options.buttons}
        onDismiss={hideAlert}
        showCloseButton={alertState.options.showCloseButton}
        icon={alertState.options.icon}
        customIcon={alertState.options.customIcon}
        animationType={alertState.options.animationType}
        backgroundColor={alertState.options.backgroundColor}
        overlayColor={alertState.options.overlayColor}
        borderRadius={alertState.options.borderRadius}
        maxWidth={alertState.options.maxWidth}
        showIcon={alertState.options.showIcon}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#6B7280',
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  errorButton: {
    backgroundColor: '#EF4444',
  },
  warningButton: {
    backgroundColor: '#F59E0B',
  },
  infoButton: {
    backgroundColor: '#3B82F6',
  },
  confirmButton: {
    backgroundColor: '#8B5CF6',
  },
  customButton: {
    backgroundColor: '#EC4899',
  },
  animatedButton: {
    backgroundColor: '#06B6D4',
  },
});

export default AlertExamples;
