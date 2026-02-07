export interface CategoryField {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text';
  options?: string[];
  required?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  fields: CategoryField[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'clothing',
    name: 'Clothing',
    icon: 'Shirt',
    fields: [
      { key: 'size', label: 'Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], required: true },
      { key: 'gender', label: 'Gender', type: 'select', options: ['Men', 'Women', 'Unisex'], required: true },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair', 'Poor'], required: true },
    ],
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: 'Cpu',
    fields: [
      { key: 'brand', label: 'Brand', type: 'text', required: true },
      { key: 'model', label: 'Model', type: 'text' },
      { key: 'storage', label: 'Storage (GB)', type: 'number' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair', 'Poor'], required: true },
    ],
  },
  {
    id: 'furniture',
    name: 'Furniture',
    icon: 'Armchair',
    fields: [
      { key: 'material', label: 'Material', type: 'select', options: ['Wood', 'Metal', 'Fabric', 'Leather', 'Plastic', 'Glass', 'Other'] },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'dimensions', label: 'Dimensions', type: 'text' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair', 'Poor'], required: true },
    ],
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    icon: 'Car',
    fields: [
      { key: 'make', label: 'Make', type: 'text', required: true },
      { key: 'model', label: 'Model', type: 'text', required: true },
      { key: 'year', label: 'Year', type: 'number', required: true },
      { key: 'mileage', label: 'Mileage', type: 'number' },
      { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair', 'Poor'], required: true },
    ],
  },
  {
    id: 'collectibles',
    name: 'Collectibles',
    icon: 'Gem',
    fields: [
      { key: 'era', label: 'Era/Period', type: 'text' },
      { key: 'authenticity', label: 'Authenticity', type: 'select', options: ['Certified', 'Uncertified', 'Unknown'] },
      { key: 'condition', label: 'Condition', type: 'select', options: ['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'], required: true },
    ],
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'Package',
    fields: [
      { key: 'condition', label: 'Condition', type: 'select', options: ['New', 'Like New', 'Good', 'Fair', 'Poor'], required: true },
    ],
  },
];

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryFields(categoryId: string): CategoryField[] {
  return getCategoryById(categoryId)?.fields || [];
}
