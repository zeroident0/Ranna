import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Modal, ScrollView } from 'react-native';
import { useTheme } from '../theme/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';

interface CustomGalleryProps {
  images: Array<{
    image_url?: string;
    thumb_url?: string;
    fallback?: string;
    alt_text?: string;
  }>;
  onPress?: (index: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const CustomGallery: React.FC<CustomGalleryProps> = ({ images, onPress }) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setModalVisible(true);
    onPress?.(index);
  };

  const renderImage = (image: any, index: number) => {
    const imageUrl = image.image_url || image.thumb_url || image.fallback;
    
    if (!imageUrl) {
      return (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.backgroundSecondary }]}>
          <Ionicons name="image-outline" size={24} color={theme.colors.textSecondary} />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={styles.imageContainer}
        onPress={() => handleImagePress(index)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        {images.length > 1 && (
          <View style={styles.imageOverlay}>
            <Text style={[styles.imageCount, { color: theme.colors.textOnPrimary }]}>
              {index + 1}/{images.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getGalleryLayout = () => {
    const imageCount = images.length;
    
    if (imageCount === 1) {
      return (
        <View style={styles.singleImageContainer}>
          {renderImage(images[0], 0)}
        </View>
      );
    }
    
    if (imageCount === 2) {
      return (
        <View style={styles.twoImageContainer}>
          {images.map((image, index) => (
            <View key={index} style={styles.twoImageItem}>
              {renderImage(image, index)}
            </View>
          ))}
        </View>
      );
    }
    
    if (imageCount === 3) {
      return (
        <View style={styles.threeImageContainer}>
          <View style={styles.threeImageMain}>
            {renderImage(images[0], 0)}
          </View>
          <View style={styles.threeImageSide}>
            {images.slice(1).map((image, index) => (
              <View key={index + 1} style={styles.threeImageSideItem}>
                {renderImage(image, index + 1)}
              </View>
            ))}
          </View>
        </View>
      );
    }
    
    // 4 or more images
    return (
      <View style={styles.fourImageContainer}>
        {images.slice(0, 4).map((image, index) => (
          <View key={index} style={styles.fourImageItem}>
            {renderImage(image, index)}
            {index === 3 && images.length > 4 && (
              <View style={styles.moreImagesOverlay}>
                <Text style={[styles.moreImagesText, { color: theme.colors.textOnPrimary }]}>
                  +{images.length - 4}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {getGalleryLayout()}
      
      {/* Full screen image modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setModalVisible(false)}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedImageIndex * screenWidth, y: 0 }}
          >
            {images.map((image, index) => {
              const imageUrl = image.image_url || image.thumb_url || image.fallback;
              return (
                <View key={index} style={styles.modalImageContainer}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                </View>
              );
            })}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Text style={styles.modalImageInfo}>
              {selectedImageIndex + 1} of {images.length}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  singleImageContainer: {
    width: '100%',
    maxWidth: 250,
  },
  twoImageContainer: {
    flexDirection: 'row',
    gap: 4,
    maxWidth: 250,
  },
  twoImageItem: {
    flex: 1,
  },
  threeImageContainer: {
    flexDirection: 'row',
    gap: 4,
    maxWidth: 250,
  },
  threeImageMain: {
    flex: 1,
  },
  threeImageSide: {
    flex: 1,
    gap: 4,
  },
  threeImageSideItem: {
    flex: 1,
  },
  fourImageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 250,
  },
  fourImageItem: {
    width: '48%',
    aspectRatio: 1,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  moreImagesText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  modalImageContainer: {
    width: screenWidth,
    height: '100%',
    justifyContent: 'center',
  },
  modalImage: {
    width: screenWidth,
    height: '80%',
  },
  modalFooter: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modalImageInfo: {
    color: 'white',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
});

export default CustomGallery;

