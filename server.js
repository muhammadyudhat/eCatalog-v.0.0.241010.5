import express from 'express';
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3001;

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

// User login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM public.users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'An error occurred during login' });
  }
});

// User registration
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO public.users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, email, hashedPassword, 'user']
    );
    const newUser = result.rows[0];
    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: newUser });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'An error occurred during registration' });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, c.name AS category, s.name AS sub_category
      FROM public.products p
      LEFT JOIN public.subcategories s ON p.subcategory_id = s.id
      LEFT JOIN public.categories c ON s.category_id = c.id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'An error occurred while fetching products' });
  }
});

// Add a new product
app.post('/api/products', async (req, res) => {
  const { name, price, category, subCategory, sku, description, image } = req.body;
  try {
    // First, get the subcategory_id
    const subcategoryResult = await pool.query(
      'SELECT s.id FROM public.subcategories s JOIN public.categories c ON s.category_id = c.id WHERE c.name = $1 AND s.name = $2',
      [category, subCategory]
    );
    if (subcategoryResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid category or subcategory' });
    }
    const subcategoryId = subcategoryResult.rows[0].id;

    const result = await pool.query(
      'INSERT INTO public.products (name, price, subcategory_id, sku, description, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, price, subcategoryId, sku, description, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ message: 'An error occurred while adding the product' });
  }
});

// Update a product
app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, subCategory, sku, description, image } = req.body;
  try {
    // First, get the subcategory_id
    const subcategoryResult = await pool.query(
      'SELECT s.id FROM public.subcategories s JOIN public.categories c ON s.category_id = c.id WHERE c.name = $1 AND s.name = $2',
      [category, subCategory]
    );
    if (subcategoryResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid category or subcategory' });
    }
    const subcategoryId = subcategoryResult.rows[0].id;

    const result = await pool.query(
      'UPDATE public.products SET name = $1, price = $2, subcategory_id = $3, sku = $4, description = $5, image = $6 WHERE id = $7 RETURNING *',
      [name, price, subcategoryId, sku, description, image, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'An error occurred while updating the product' });
  }
});

// Toggle product status
app.patch('/api/products/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE public.products SET disabled = NOT disabled WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling product status:', error);
    res.status(500).json({ message: 'An error occurred while toggling the product status' });
  }
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM public.categories ORDER BY name');
    res.json(result.rows.map(row => row.name));
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'An error occurred while fetching categories' });
  }
});

// Add a new category
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO public.categories (name) VALUES ($1) RETURNING name',
      [name]
    );
    res.status(201).json(result.rows[0].name);
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ message: 'An error occurred while adding the category' });
  }
});

// Get subcategories for a category
app.get('/api/categories/:categoryName/subcategories', async (req, res) => {
  const { categoryName } = req.params;
  try {
    const result = await pool.query(
      'SELECT s.name FROM public.subcategories s JOIN public.categories c ON s.category_id = c.id WHERE c.name = $1 ORDER BY s.name',
      [categoryName]
    );
    res.json(result.rows.map(row => row.name));
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ message: 'An error occurred while fetching subcategories' });
  }
});

// Add a new subcategory
app.post('/api/categories/:categoryName/subcategories', async (req, res) => {
  const { categoryName } = req.params;
  const { name } = req.body;
  try {
    const categoryResult = await pool.query('SELECT id FROM public.categories WHERE name = $1', [categoryName]);
    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    const categoryId = categoryResult.rows[0].id;

    const result = await pool.query(
      'INSERT INTO public.subcategories (name, category_id) VALUES ($1, $2) RETURNING name',
      [name, categoryId]
    );
    res.status(201).json(result.rows[0].name);
  } catch (error) {
    console.error('Error adding subcategory:', error);
    res.status(500).json({ message: 'An error occurred while adding the subcategory' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});