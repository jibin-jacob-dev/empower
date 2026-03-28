import React, { useState, useEffect, memo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  ActivityIndicator, 
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Endpoints } from '../../constants/Endpoints';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

const CategoryItem = memo(({ item, theme, onEdit, onDelete }) => (
  <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View style={styles.info}>
      <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
      <Text style={[styles.type, { color: theme.icon }]}>{item.targetType}</Text>
    </View>
    <View style={styles.actions}>
      <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionBtn}>
        <Ionicons name="create-outline" size={22} color={theme.tint} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(item.id, item.name)} style={styles.actionBtn}>
        <Ionicons name="trash-outline" size={22} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  </View>
));

export default function CategoryManageScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState('Product'); // Default

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(Endpoints.Categories);
      setCategories(response.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const payload = { name: name.trim(), targetType };

      if (editingId) {
        await axios.put(`${Endpoints.Categories}/${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(Endpoints.Categories, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setModalVisible(false);
      setName('');
      setEditingId(null);
      fetchCategories();
    } catch (err) {
      Alert.alert('Error', err.response?.data || 'Failed to save category');
    }
  };

  const openEditor = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setName(item.name);
      setTargetType(item.targetType);
    } else {
      setEditingId(null);
      setName('');
      setTargetType('Product');
    }
    setModalVisible(true);
  };

  const handleDelete = (id, title) => {
    Alert.alert("Delete Category", `Remove "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const token = await SecureStore.getItemAsync('userToken');
        await axios.delete(`${Endpoints.Categories}/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchCategories();
      }}
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Manage Categories</Text>
        <TouchableOpacity onPress={() => openEditor()} style={styles.addBtn}>
          <Ionicons name="add" size={28} color={theme.tint} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        renderItem={({ item }) => (
          <CategoryItem 
            item={item} 
            theme={theme} 
            onEdit={openEditor} 
            onDelete={handleDelete}
          />
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={<ActivityIndicator color={theme.tint} />}
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior="padding" style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{editingId ? 'Edit Category' : 'New Category'}</Text>
            
            <TextInput 
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Category Name"
              placeholderTextColor={theme.icon}
            />

            <View style={styles.typeRow}>
              {['Product', 'Training'].map(type => (
                <TouchableOpacity 
                  key={type}
                  style={[styles.typeChip, targetType === type && { backgroundColor: theme.tint }]}
                  onPress={() => setTargetType(type)}
                >
                  <Text style={[styles.typeText, { color: theme.text }, targetType === type && { color: 'white' }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBtn}>
                <Text style={{ color: theme.icon, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={[styles.modalBtn, { backgroundColor: theme.tint, borderRadius: 10 }]}>
                <Text style={{ color: 'white', fontWeight: '800' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: '800' },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1.5, marginBottom: 12 },
  name: { fontSize: 16, fontWeight: '700' },
  type: { fontSize: 12, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  input: { padding: 14, borderRadius: 12, borderWidth: 1.5, fontSize: 16, fontWeight: '600' },
  typeRow: { flexDirection: 'row', marginTop: 16, gap: 10 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: '#eee' },
  typeText: { fontSize: 14, fontWeight: '700' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 20 }
});
