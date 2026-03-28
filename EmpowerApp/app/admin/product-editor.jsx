import React, { useState, useEffect, memo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/Colors';
import { Endpoints } from '../../constants/Endpoints';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

// --- Sub-components (Fixed-Focus Pattern) ---

const FormInput = memo(({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false, theme }) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, { color: theme.icon }]}>{label}</Text>
    <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <TextInput
        style={[styles.input, { color: theme.text, height: multiline ? 100 : 48 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.icon + '80'}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  </View>
));

const CategorySelector = memo(({ categories, selectedCategory, onSelect, theme }) => {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.inputGroup}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[styles.label, { color: theme.icon, marginBottom: 0 }]}>Category</Text>
        <TouchableOpacity onPress={() => router.push('/admin/categories')}>
          <Text style={{ color: theme.tint, fontSize: 13, fontWeight: '700' }}>Manage All</Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={showDropdown ? search : (selectedCategory || search)}
          onChangeText={(t) => {
            setSearch(t);
            setShowDropdown(true);
          }}
          onFocus={() => {
            setShowDropdown(true);
            setSearch(selectedCategory || '');
          }}
          placeholder="Search or type category..."
          placeholderTextColor={theme.icon + '80'}
        />
        <Ionicons 
          name={showDropdown ? "chevron-up" : "search-outline"} 
          size={18} 
          color={theme.icon} 
          style={{ position: 'absolute', right: 16, top: 14 }}
        />
      </View>

      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.map((cat) => (
              <TouchableOpacity 
                key={cat.id}
                style={[styles.dropItem, { borderBottomColor: theme.border + '20' }]}
                onPress={() => {
                  onSelect(cat.name);
                  setSearch(cat.name);
                  setShowDropdown(false);
                  Keyboard.dismiss();
                }}
              >
                <Text style={[styles.dropText, { color: theme.text }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
            {search.length > 0 && !categories.some(c => c.name.toLowerCase() === search.toLowerCase()) && (
              <TouchableOpacity 
                style={styles.dropItem}
                onPress={() => {
                  onSelect(search);
                  setShowDropdown(false);
                  Keyboard.dismiss();
                }}
              >
                <Text style={[styles.dropText, { color: theme.tint, fontWeight: '800' }]}>+ Add "{search}"</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
});

// --- Main Screen ---

export default function ProductEditor() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stockQuantity: '0',
    imageUrl: ''
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (id) fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${Endpoints.Categories}?type=Product`);
      setCategories(response.data);
    } catch (err) {
      console.error('Fetch categories error:', err);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      const response = await axios.get(`${Endpoints.Products}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const p = response.data;
      setForm({
        name: p.name,
        description: p.description || '',
        price: p.price.toString(),
        category: p.category || '',
        stockQuantity: p.stockQuantity.toString(),
        imageUrl: p.imageUrl || ''
      });
    } catch (err) {
      Alert.alert('Error', 'Could not load product details');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    try {
      setImageLoading(true);
      const token = await SecureStore.getItemAsync('userToken');
      
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'product.jpg',
        type: 'image/jpeg',
      });

      const response = await axios.post(`${Endpoints.Products}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      setForm(prev => ({ ...prev, imageUrl: response.data.imageUrl }));
    } catch (error) {
      Alert.alert('Upload Failed', 'Could not upload product image.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      Alert.alert('Validation', 'Please provide Name and Price.');
      return;
    }

    if (!form.category) {
      Alert.alert('Validation', 'Please select or enter a category.');
      return;
    }

    try {
      setSaving(true);
      const token = await SecureStore.getItemAsync('userToken');
      const payload = {
        ...form,
        price: parseFloat(form.price),
        stockQuantity: parseInt(form.stockQuantity)
      };

      if (id) {
        await axios.put(`${Endpoints.Products}/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(Endpoints.Products, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      router.back();
    } catch (err) {
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>{id ? 'Edit Product' : 'New Product'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={theme.tint} /> : <Text style={[styles.saveBtn, { color: theme.tint }]}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.form} 
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Image Section */}
            <TouchableOpacity style={[styles.imagePicker, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={pickImage}>
              {form.imageUrl ? (
                <Image source={{ uri: form.imageUrl }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={40} color={theme.icon} />
                  <Text style={{ color: theme.icon, marginTop: 8 }}>Upload Product Photo</Text>
                </View>
              )}
              {imageLoading && (
                <View style={[styles.imageOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                  <ActivityIndicator color="white" />
                </View>
              )}
            </TouchableOpacity>

            <FormInput 
              label="Product Name"
              value={form.name}
              onChangeText={(t) => setForm(p => ({ ...p, name: t }))}
              placeholder="e.g. Whey Protein Isolate"
              theme={theme}
            />

            <CategorySelector 
              categories={categories}
              selectedCategory={form.category}
              onSelect={(t) => setForm(p => ({ ...p, category: t }))}
              theme={theme}
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <FormInput 
                  label="Price (₹)"
                  value={form.price}
                  onChangeText={(t) => setForm(p => ({ ...p, price: t }))}
                  placeholder="0.00"
                  keyboardType="numeric"
                  theme={theme}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <FormInput 
                  label="Stock Quantity"
                  value={form.stockQuantity}
                  onChangeText={(t) => setForm(p => ({ ...p, stockQuantity: t }))}
                  placeholder="0"
                  keyboardType="numeric"
                  theme={theme}
                />
              </View>
            </View>

            <FormInput 
              label="Description"
              value={form.description}
              onChangeText={(t) => setForm(p => ({ ...p, description: t }))}
              placeholder="Tell us about this product..."
              multiline
              theme={theme}
            />
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  closeBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800' },
  saveBtn: { fontSize: 16, fontWeight: '800' },
  form: { padding: 16 },
  imagePicker: { width: '100%', height: 200, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 24, justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  inputGroup: { marginBottom: 20, zIndex: 10 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  input: { paddingHorizontal: 16, fontSize: 16, fontWeight: '600', height: 48 },
  row: { flexDirection: 'row' },
  dropdown: { 
    position: 'absolute', 
    top: 75, 
    left: 0, 
    right: 0, 
    borderRadius: 14, 
    borderWidth: 1.5, 
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  dropItem: { padding: 14, borderBottomWidth: 1 },
  dropText: { fontSize: 15, fontWeight: '600' }
});
