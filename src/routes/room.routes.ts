import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';
const db = require('../config');

const router = Router();

// Validation middleware
const roomValidation = [
  body('location').notEmpty().withMessage('Location is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('features').optional().isJSON().withMessage('Features must be valid JSON'),
  body('building').notEmpty().withMessage('Building name is required'),
  body('floor').notEmpty().withMessage('Floor is required'),
];

const bookingValidation = [
  body('userID').notEmpty().withMessage('User ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('purpose').notEmpty().withMessage('Booking purpose is required'),
];

// Get all rooms
router.get('/', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // Get all rooms
    const [rooms] = await db.query('SELECT * FROM room');
    
    // Get all future bookings
    const [bookings] = await db.query(
      'SELECT * FROM booking WHERE startTime >= NOW()'
    );
    
    // Combine the data
    const formattedRooms = rooms.map((room: any) => ({
      ...room,
      bookings: bookings.filter((booking: any) => booking.roomID === room.roomID)
    }));

    return res.json(formattedRooms);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching rooms' });
  }
});

// Get room by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get the room
    const [rooms] = await db.query(
      'SELECT * FROM room WHERE roomID = ?',
      [req.params.id]
    );

    if (rooms.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Get future bookings for this room
    const [bookings] = await db.query(
      'SELECT * FROM booking WHERE roomID = ? AND startTime >= NOW()',
      [req.params.id]
    );

    // Combine the data
    const formattedRoom = {
      ...rooms[0],
      bookings: bookings
    };

    return res.json(formattedRoom);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching room' });
  }
});

// Create room (Admin only)
router.post('/', authenticateToken, authorizeRole(['ADMIN']), roomValidation, async (req: Request, res: Response) => {
  try {
    const { location, capacity, features, building, floor } = req.body;

    const [result] = await db.query(
      'INSERT INTO room (location, capacity, features, building, floor) VALUES (?, ?, ?, ?, ?)',
      [location, capacity, JSON.stringify(features), building, floor]
    );

    const [newRoom] = await db.query('SELECT * FROM room WHERE roomID = ?', [result.insertId]);

    res.status(201).json({
      message: 'Room created successfully',
      room: newRoom[0],
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating room' });
  }
});

// Update room (Admin only)
router.put('/:id', authenticateToken, authorizeRole(['ADMIN']), roomValidation, async (req: Request, res: Response) => {
  try {
    const { location, capacity, features, building, floor } = req.body;

    await db.query(
      'UPDATE room SET location = ?, capacity = ?, features = ?, building = ?, floor = ? WHERE roomID = ?',
      [location, capacity, JSON.stringify(features), building, floor, req.params.id]
    );

    const [updatedRoom] = await db.query('SELECT * FROM room WHERE roomID = ?', [req.params.id]);

    res.json({
      message: 'Room updated successfully',
      room: updatedRoom[0],
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating room' });
  }
});

// Delete room (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    await db.query('DELETE FROM room WHERE roomID = ?', [req.params.id]);

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting room' });
  }
});

// Create room booking
router.post('/:id/book', authenticateToken, bookingValidation, async (req: Request, res: Response) => {
  try {
    const { userID, startTime, endTime, purpose } = req.body;
    const roomID = req.params.id;

    // Check if room exists
    const [rooms] = await db.query('SELECT * FROM room WHERE roomID = ?', [roomID]);

    if (rooms.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check for booking conflicts
    const [conflictingBookings] = await db.query(`
      SELECT * FROM booking 
      WHERE roomID = ? 
      AND status != 'cancelled'
      AND (
        (startTime <= ? AND endTime > ?) 
        OR (startTime < ? AND endTime >= ?)
      )
    `, [roomID, startTime, startTime, endTime, endTime]);

    if (conflictingBookings.length > 0) {
      return res.status(400).json({ message: 'Room is already booked for this time' });
    }

    // Create booking
    const [result] = await db.query(
      'INSERT INTO booking (userID, roomID, startTime, endTime, purpose) VALUES (?, ?, ?, ?, ?)',
      [userID, roomID, startTime, endTime, purpose]
    );

    const [newBooking] = await db.query('SELECT * FROM booking WHERE bookingID = ?', [result.insertId]);

    return res.status(201).json({
      message: 'Room booked successfully',
      booking: newBooking[0],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error booking room' });
  }
});

// Get room bookings
router.get('/:id/bookings', authenticateToken, async (req, res) => {
  try {
    const [bookings] = await db.query(`
      SELECT b.*, 
        JSON_OBJECT(
          'userID', u.userID,
          'name', u.name,
          'email', u.email
        ) as user
      FROM booking b
      JOIN user u ON b.userID = u.userID
      WHERE b.roomID = ? AND b.startTime >= NOW()
      ORDER BY b.startTime ASC
    `, [req.params.id]);

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// Update booking status
router.put('/bookings/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    await db.query(
      'UPDATE booking SET status = ? WHERE bookingID = ?',
      [status, req.params.id]
    );

    const [updatedBooking] = await db.query('SELECT * FROM booking WHERE bookingID = ?', [req.params.id]);

    res.json({
      message: 'Booking status updated successfully',
      booking: updatedBooking[0],
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking status' });
  }
});

export default router; 