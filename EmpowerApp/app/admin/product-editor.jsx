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

const CategorySelector = memo(({ label, categories, selectedCategory, onSelect, onCustomChange, customValue, theme }) => (
  <View style={styles.inputGroup}>
    <Text style={[styles.label, { color: theme.icon }]}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
      {categories.map((cat) => (
        <TouchableOpacity 
          key={cat}
          style={[
            styles.categoryChip, 
            { backgroundColor: theme.surface, borderColor: theme.border },
            selectedCategory === cat && { backgroundColor: theme.tint, borderColor: theme.tint }
          ]}
          onPress={() => onSelect(cat)}
        >
          <Text style={[styles.categoryText, { color: theme.text }, selectedCategory === cat && { color: 'white' }]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity 
        style={[
          styles.categoryChip, 
          { backgroundColor: theme.surface, borderColor: theme.border },
          selectedCategory === 'Other' && { backgroundColor: theme.tint, borderColor: theme.tint }
        ]}
        onPress={() => onSelect('Other')}
      >
        <Text style={[styles.categoryText, { color: theme.text }, selectedCategory === 'Other' && { color: 'white' }]}>
          + New
        </Text>
      </TouchableOpacity>
    </ScrollView>
    
    {selectedCategory === 'Other' && (
      <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 10 }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={customValue}
          onChangeText={onCustomChange}
          placeholder="Type new category..."
          placeholderTextColor={theme.icon + '80'}
        />
      </View>
    )}
  </View>
));

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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (id) fetchProduct();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${Endpoints.Products}/categories`);
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
      
      if (categories.includes(p.category)) {
        setSelectedCategory(p.category);
      } else {
        setSelectedCategory('Other');
        setCustomCategory(p.category);
      }
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

    const finalCategory = selectedCategory === 'Other' ? customCategory : selectedCategory;
    if (!finalCategory) {
      Alert.alert('Validation', 'Please select or enter a category.');
      return;
    }

    try {
      setSaving(true);
      const token = await SecureStore.getItemAsync('userToken');
      const payload = {
        ...form,
        category: finalCategory,
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

          <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
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
              label="Category"
              categories={categories}
              selectedCategory={selectedCategory}
              onSelect={setSelectedCategory}
              customValue={customCategory}
              onCustomChange={setCustomCategory}
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
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  input: { paddingHorizontal: 16, fontSize: 16, fontWeight: '600' },
  row: { flexDirection: 'row' },
  categoryScroll: { marginBottom: 4 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  categoryText: { fontSize: 14, fontWeight: '700' }
});
