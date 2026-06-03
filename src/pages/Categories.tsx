import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { Category } from '../types/budget';
import '../styles/Categories.css';

interface CategoryFormData {
  name: string;
  type: 'income' | 'expense';
  color: string;
}

const Categories: React.FC = () => {
  const { state, addCategory, updateCategory, deleteCategory } = useBudget();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
    color: '#3498db'
  });

  const presetColors = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#e67e22', '#16a085', '#27ae60'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Please enter a category name');
      return;
    }

    // Check if category name already exists
    const existingCategory = state.categories.find(cat => 
      cat.name.toLowerCase() === formData.name.toLowerCase() && cat.id !== editingCategory
    );
    
    if (existingCategory) {
      alert('A category with this name already exists');
      return;
    }

    const categoryData = {
      name: formData.name.trim(),
      type: formData.type,
      color: formData.color
    };

    if (editingCategory) {
      updateCategory({
        ...categoryData,
        id: editingCategory
      });
      setEditingCategory(null);
    } else {
      addCategory(categoryData);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      color: '#3498db'
    });
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color
    });
    setEditingCategory(category.id);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    // Check if category is being used in transactions
    const category = state.categories.find(cat => cat.id === id);
    if (category) {
      const isUsed = state.transactions.some(t => t.category === category.name);
      if (isUsed) {
        alert('Cannot delete a category that is being used in transactions.');
        return;
      }
    }

    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategory(id);
    }
  };

  const incomeCategories = state.categories.filter(cat => cat.type === 'income');
  const expenseCategories = state.categories.filter(cat => cat.type === 'expense');

  return (
    <div className="categories-page">
      <div className="page-header">
        <h2>Category Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Category'}
        </button>
      </div>

      {showAddForm && (
        <div className="category-form-container">
          <div className="form-header">
            <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
            <button className="close-btn" onClick={resetForm}>&times;</button>
          </div>
          
          <form className="category-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Category Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter category name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Type</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  disabled={editingCategory !== null} // Don't allow changing type for existing categories
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="color">Color</label>
              <div className="color-picker">
                <input
                  type="color"
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  required
                />
                <div className="preset-colors">
                  {presetColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className="color-preset"
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingCategory ? 'Update Category' : 'Add Category'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="categories-section">
        <div className="categories-container">
          <div className="category-group">
            <h3>Income Categories</h3>
            <div className="categories-grid">
              {incomeCategories.map(category => (
                <div key={category.id} className="category-card">
                  <div className="category-header">
                    <div 
                      className="category-color" 
                      style={{ backgroundColor: category.color }}
                    />
                    <h4>{category.name}</h4>
                    <div className="category-actions">
                      <button 
                        className="btn btn-sm btn-edit"
                        onClick={() => handleEdit(category)}
                        title="Edit category"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn btn-sm btn-delete"
                        onClick={() => handleDelete(category.id)}
                        title="Delete category"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="category-info">
                    <span className="category-type">Income</span>
                    <div className="category-color-code">
                      {category.color}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="category-group">
            <h3>Expense Categories</h3>
            <div className="categories-grid">
              {expenseCategories.map(category => (
                <div key={category.id} className="category-card">
                  <div className="category-header">
                    <div 
                      className="category-color" 
                      style={{ backgroundColor: category.color }}
                    />
                    <h4>{category.name}</h4>
                    <div className="category-actions">
                      <button 
                        className="btn btn-sm btn-edit"
                        onClick={() => handleEdit(category)}
                        title="Edit category"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn btn-sm btn-delete"
                        onClick={() => handleDelete(category.id)}
                        title="Delete category"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="category-info">
                    <span className="category-type">Expense</span>
                    <div className="category-color-code">
                      {category.color}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="category-usage">
        <h3>Category Usage</h3>
        <div className="usage-stats">
          {state.categories.map(category => {
            const usageCount = state.transactions.filter(t => t.category === category.name).length;
            return (
              <div key={category.id} className="usage-item">
                <div className="usage-info">
                  <div 
                    className="usage-color" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="usage-name">{category.name}</span>
                </div>
                <div className="usage-count">
                  {usageCount} {usageCount === 1 ? 'transaction' : 'transactions'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Categories;