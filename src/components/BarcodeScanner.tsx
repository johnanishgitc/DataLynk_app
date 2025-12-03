import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';

interface BarcodeScannerProps {
  isVisible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ isVisible, onClose, onScan }: BarcodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    // Request camera permissions when component mounts
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    onScan(data);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const renderCamera = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.text}>Requesting camera permission...</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.text}>No access to camera</Text>
          <TouchableOpacity style={styles.button} onPress={handleClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Dynamically render Camera component
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={{ width: '100%', height: '95%' }} barcodeScannerSettings={{ barcodeTypes: ['aztec' , 'ean13' , 'ean8' , 'qr' , 'pdf417' , 'upc_e' , 'datamatrix' , 'code39' , 'code93' , 'itf14' , 'codabar' , 'code128' , 'upc_a'] }} onBarcodeScanned={handleBarCodeScanned} />
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.rescanButton} onPress={handleClose}>
              <Text style={styles.rescanButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
      </View>
    );
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {renderCamera()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  cameraContainer: {
    flex: 1,
    // justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  rescanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  rescanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  text: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
