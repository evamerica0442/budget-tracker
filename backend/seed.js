#!/usr/bin/env node

/**
 * Database Seed Script
 * Populates MongoDB with default South African categories
 * 
 * Usage:
 *   node seed.js
 *   npm run seed
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget_tracker';

const defaultCategories = [
  // South African Income Categories
  { name: 'salary', displayName: 'Salary', type: 'income', color: '#27ae60' },
  { name: 'business income', displayName: 'Business Income', type: 'income', color: '#2ecc71' },
  { name: 'freelance work', displayName: 'Freelance Work', type: 'income', color: '#16a085' },
  { name: 'investment returns', displayName: 'Investment Returns', type: 'income', color: '#1abc9c' },
  { name: 'rental income', displayName: 'Rental Income', type: 'income', color: '#3498db' },
  { name: 'pension', displayName: 'Pension', type: 'income', color: '#9b59b6' },
  { name: 'grants/benefits', displayName: 'Grants/Benefits', type: 'income', color: '#f39c12' },

  // South African Expense Categories
  { name: 'groceries', displayName: 'Groceries', type: 'expense', color: '#e74c3c' },
  { name: 'transport (fuel)', displayName: 'Transport (Fuel)', type: 'expense', color: '#f39c12' },
  { name: 'transport (public)', displayName: 'Transport (Public)', type: 'expense', color: '#e67e22' },
  { name: 'bond/rent', displayName: 'Bond/Rent', type: 'expense', color: '#3498db' },
  { name: 'electricity', displayName: 'Electricity', type: 'expense', color: '#9b59b6' },
  { name: 'water', displayName: 'Water', type: 'expense', color: '#16a085' },
  { name: 'internet', displayName: 'Internet', type: 'expense', color: '#1abc9c' },
  { name: 'cell phone', displayName: 'Cell Phone', type: 'expense', color: '#34495e' },
  { name: 'medical aid', displayName: 'Medical Aid', type: 'expense', color: '#e67e22' },
  { name: 'doctors/hospitals', displayName: 'Doctors/Hospitals', type: 'expense', color: '#f39c12' },
  { name: 'school fees', displayName: 'School Fees', type: 'expense', color: '#3498db' },
  { name: 'petrol', displayName: 'Petrol', type: 'expense', color: '#e74c3c' },
  { name: 'insurance', displayName: 'Insurance', type: 'expense', color: '#9b59b6' },
  { name: 'rates & taxes', displayName: 'Rates & Taxes', type: 'expense', color: '#16a085' },
  { name: 'tv license', displayName: 'TV License', type: 'expense', color: '#1abc9c' },
  { name: 'entertainment', displayName: 'Entertainment', type: 'expense', color: '#34495e' },
  { name: 'dining out', displayName: 'Dining Out', type: 'expense', color: '#e74c3c' },
  { name: 'shopping', displayName: 'Shopping', type: 'expense', color: '#f39c12' },
];

async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if categories already exist
    const existingCount = await Category.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  Database already contains ${existingCount} categories.`);
      
      const answer = await new Promise((resolve) => {
        process.stdout.write('Do you want to clear and reseed? (y/N): ');
        process.stdin.once('data', (data) => {
          resolve(data.toString().trim().toLowerCase());
        });
      });

      if (answer === 'y') {
        console.log('🗑️  Clearing existing categories...');
        await Category.deleteMany({});
      } else {
        console.log('✨ Skipping seed. Existing data preserved.');
        await mongoose.connection.close();
        process.exit(0);
      }
    }

    // Insert default categories
    console.log('📥 Inserting default categories...');
    const inserted = await Category.insertMany(defaultCategories);
    console.log(`✅ Inserted ${inserted.length} categories`);

    // Show summary
    const incomeCount = await Category.countDocuments({ type: 'income' });
    const expenseCount = await Category.countDocuments({ type: 'expense' });
    console.log(`\n📊 Summary:`);
    console.log(`   💰 Income categories: ${incomeCount}`);
    console.log(`   💸 Expense categories: ${expenseCount}`);
    console.log(`   📈 Total: ${incomeCount + expenseCount}`);

    console.log('\n✨ Database seeding completed successfully!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log('\n⚠️  Seed interrupted');
  await mongoose.connection.close();
  process.exit(0);
});

seed();
