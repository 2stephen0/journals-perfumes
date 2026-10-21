import { pgTable, serial, text, integer, jsonb } from 'drizzle-orm/pg-core';
export const products = pgTable('products', {
  id: serial('id').primaryKey(), name: text('name').notNull(), brand: text('brand').notNull().default(''),
  price: integer('price').notNull(), old_price: integer('old_price'), description: text('description').notNull().default(''),
  size: text('size').notNull().default(''), category: text('category').notNull().default('Unisex'),
  fragrance: text('fragrance').notNull().default(''), stock: integer('stock').notNull().default(0),
  additional_images: jsonb('additional_images').$type<string[]>().notNull().default([]),
  image: text('image').notNull().default(''), featured: integer('featured').notNull().default(0), active: integer('active').notNull().default(1),
});
export const settings = pgTable('settings', { key: text('key').primaryKey(), value: text('value').notNull() });
