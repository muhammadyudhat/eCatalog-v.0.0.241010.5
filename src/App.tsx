import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Hero from './components/Hero'
import FeaturedProducts from './components/FeaturedProducts'
import ProductManagement from './components/ProductManagement'
import UserManagement from './components/UserManagement'
import FeatureManagement from './components/FeatureManagement'
import Footer from './components/Footer'
import AddCategory from './components/AddCategory'
import FavoriteProducts from './components/FavoriteProducts'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'

// ... (keep the existing type definitions)

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categorySubCategories, setCategorySubCategories] = useState<Record<string, string[]>>({});
  const [favorites, setFavorites] = useState<number[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
    }

    // Fetch products, categories, and subcategories
    fetchProducts();
    fetchCategories();

    // Load dummy data for users and features (you can replace this with actual API calls later)
    setUsers([
      { id: 1, username: "admin", email: "admin@example.com", role: "admin" },
      // Add more dummy users here
    ]);

    setFeatures([
      {
        id: 1,
        name: "Product Management",
        description: "Manage products in the store",
        permissions: { admin: true, manager: true, user: false }
      },
      // Add more dummy features here
    ]);
  }, []);

  // ... (keep the existing fetch functions and handlers)

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Header isAuthenticated={isAuthenticated} onLogout={() => {
          setIsAuthenticated(false);
          setCurrentUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }} />
        <div className="pt-16">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
            />
            <Route
              path="/product-management"
              element={
                isAuthenticated ? (
                  <ProductManagement
                    products={products}
                    categories={categories}
                    categorySubCategories={categorySubCategories}
                    onAddProduct={handleAddProduct}
                    onEditProduct={handleEditProduct}
                    onToggleProductStatus={handleToggleProductStatus}
                    onAddSubCategory={handleAddSubCategory}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/user-management"
              element={
                isAuthenticated ? (
                  <UserManagement
                    users={users}
                    onAddUser={handleAddUser}
                    onEditUser={handleEditUser}
                    onDeleteUser={handleDeleteUser}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/feature-management"
              element={
                isAuthenticated ? (
                  <FeatureManagement
                    features={features}
                    onUpdateFeature={handleUpdateFeature}
                  />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route path="/" element={
              <>
                <Hero />
                <FeaturedProducts
                  products={products.filter(p => !p.disabled)}
                  categories={categories}
                  categorySubCategories={categorySubCategories}
                  favorites={favorites}
                  toggleFavorite={handleToggleFavorite}
                />
              </>
            } />
          </Routes>
          <Footer />
        </div>
      </div>
    </Router>
  )
}

export default App