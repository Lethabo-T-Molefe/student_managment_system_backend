import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.middleware';
const db = require('../config');

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

const router = Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name').notEmpty().withMessage('Name is required'),
  body('roleID').isInt().withMessage('Valid role ID is required'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Register new user
router.post('/register', registerValidation, async (req: Request, res: Response) => {
  try {
    const { email, password, name, roleID } = req.body;

    // Check if user already exists
    const [existingUsers] = await db.query('SELECT * FROM user WHERE email = ?', [email]);

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.query(
      'INSERT INTO user (name, email, password, roleID) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, roleID]
    );

    const [newUser] = await db.query(`
      SELECT u.*, r.name as roleName 
      FROM user u 
      JOIN role r ON u.roleID = r.roleID 
      WHERE u.userID = ?
    `, [result.insertId]);

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser[0].userID, role: newUser[0].roleName },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userID: newUser[0].userID,
        name: newUser[0].name,
        email: newUser[0].email,
        roleID: newUser[0].roleID,
        roleName: newUser[0].roleName,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error registering user' });
  }
});

// Login user
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [users] = await db.query(`
      SELECT u.*, r.name as roleName 
      FROM user u 
      JOIN role r ON u.roleID = r.roleID 
      WHERE u.email = ?
    `, [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.userID, role: user.roleName },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        userID: user.userID,
        name: user.name,
        email: user.email,
        roleID: user.roleID,
        roleName: user.roleName,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error logging in' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [users] = await db.query(`
      SELECT u.*, r.name as roleName 
      FROM user u 
      JOIN role r ON u.roleID = r.roleID 
      WHERE u.userID = ?
    `, [req.user.userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json(users[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { name } = req.body;

    await db.query(
      'UPDATE user SET name = ? WHERE userID = ?',
      [name, req.user.userId]
    );

    const [updatedUser] = await db.query(`
      SELECT u.*, r.name as roleName 
      FROM user u 
      JOIN role r ON u.roleID = r.roleID 
      WHERE u.userID = ?
    `, [req.user.userId]);

    return res.json({
      message: 'Profile updated successfully',
      user: updatedUser[0],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating profile' });
  }
});

// Get all roles
router.get('/roles', async (_req: Request, res: Response) => {
  try {
    const [roles] = await db.query('SELECT * FROM role');
    return res.json(roles);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching roles' });
  }
});

export default router; 