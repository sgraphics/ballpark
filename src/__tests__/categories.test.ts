import { describe, it, expect } from 'vitest';
import { CATEGORIES, getCategoryById, getCategoryFields } from '@/types/categories';

describe('CATEGORIES', () => {
  it('has 6 categories', () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  it('all have unique ids', () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all have at least one field', () => {
    CATEGORIES.forEach((cat) => {
      expect(cat.fields.length).toBeGreaterThan(0);
    });
  });

  it('all have a condition field', () => {
    CATEGORIES.forEach((cat) => {
      const hasCondition = cat.fields.some((f) => f.key === 'condition');
      expect(hasCondition).toBe(true);
    });
  });

  it('select fields always have options', () => {
    CATEGORIES.forEach((cat) => {
      cat.fields.filter((f) => f.type === 'select').forEach((field) => {
        expect(field.options).toBeDefined();
        expect(field.options!.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('getCategoryById', () => {
  it('finds clothing', () => {
    expect(getCategoryById('clothing')?.name).toBe('Clothing');
  });
  it('returns undefined for invalid id', () => {
    expect(getCategoryById('nonexistent')).toBeUndefined();
  });
});

describe('getCategoryFields', () => {
  it('returns fields for valid category', () => {
    const fields = getCategoryFields('electronics');
    expect(fields.length).toBeGreaterThan(0);
    expect(fields.some((f) => f.key === 'brand')).toBe(true);
  });
  it('returns empty array for invalid category', () => {
    expect(getCategoryFields('nope')).toEqual([]);
  });
});
