// 🎨 Custom Hybrid UI Components for Android + iOS
// Reusable components following a simple design system.
// Fix: closed the `headerTitle` style object properly and added a demo export
// so this file renders in the canvas preview.

import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, ScrollView, Alert } from "react-native";

// =====================
// ✅ AppButton
// =====================
export const AppButton = ({ title, onPress, variant = "primary", disabled = false }) => {
  const buttonStyles = [styles.button];
  const textStyles = [styles.buttonText];

  if (variant === "secondary") {
    buttonStyles.push(styles.buttonSecondary);
    textStyles.push(styles.buttonTextSecondary);
  } else if (variant === "text") {
    buttonStyles.push(styles.buttonTextOnly);
    textStyles.push(styles.buttonTextLink);
  }
  if (disabled) {
    buttonStyles.push(styles.buttonDisabled);
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

// =====================
// ✅ AppInput
// =====================
export const AppInput = ({ label, placeholder, value, onChangeText, error, keyboardType = "default" }) => (
  <View style={{ marginBottom: 16 }}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <TextInput
      style={[styles.input, error && styles.inputError]}
      placeholder={placeholder}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// =====================
// ✅ AppCard
// =====================
export const AppCard = ({ children }) => <View style={styles.card}>{children}</View>;

// =====================
// ✅ AppHeader
// =====================
export const AppHeader = ({ title, left, right }) => (
  <SafeAreaView style={{ backgroundColor: "#fff" }}>
    <View style={styles.header}>
      <View style={{ width: 40 }}>{left}</View>
      <Text numberOfLines={1} style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40, alignItems: "flex-end" }}>{right}</View>
    </View>
  </SafeAreaView>
);

// =====================
// 🎛️ Demo (default export)
// A small showcase so the canvas can render something immediately.
// =====================
export default function UIComponentsDemo() {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name) return setError("Name is required");
    setError("");
    Alert.alert("Saved", `Saved ${name} x ${qty || 1}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <AppHeader title="UI Kit Demo" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <AppCard>
          <Text style={styles.sectionTitle}>Inputs</Text>
          <AppInput label="Item Name" placeholder="Enter name" value={name} onChangeText={setName} error={!name && error ? error : ""} />
          <AppInput label="Quantity" placeholder="1" value={qty} onChangeText={setQty} keyboardType="number-pad" />

          <Text style={styles.sectionTitle}>Buttons</Text>
          <AppButton title="Save" onPress={handleSave} />
          <AppButton title="Cancel" variant="secondary" onPress={() => Alert.alert("Cancelled")}/>
          <AppButton title="Learn more" variant="text" onPress={() => Alert.alert("Info", "This is a demo of the UI kit components.")} />
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

// =====================
// 🎨 Styles
// =====================
const styles = StyleSheet.create({
  button: {
    backgroundColor: "#355F51",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    marginVertical: 8,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#F2A365",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: "#F2A365",
  },
  buttonTextOnly: {
    backgroundColor: "transparent",
    paddingVertical: 8,
  },
  buttonTextLink: {
    color: "#355F51",
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#E63946",
  },
  inputLabel: {
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "500",
    color: "#222",
  },
  errorText: {
    color: "#E63946",
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    height: 56,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    textAlign: "center",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginBottom: 8,
  },
});

