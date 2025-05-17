import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRole } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Validation middleware
const roomValidation = [
  body('name').notEmpty().withMessage('Room name is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be at least 1'),
  body('type').notEmpty().withMessage('Room type is required'),
  body('floor').isInt({ min: 0 }).withMessage('Floor must be a positive number'),
  body('building').notEmpty().withMessage('Building name is required'),
];

const bookingValidation = [
  body('roomId').notEmpty().withMessage('Room ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('purpose').notEmpty().withMessage('Booking purpose is required'),
];

// Get all rooms
router.get('/', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        bookings: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
        },
      },
    });
    return res.json(rooms);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching rooms' });
  }
});

// Get room by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        bookings: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    return res.json(room);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching room' });
  }
});

// Create room (Admin only)
router.post('/', authenticateToken, authorizeRole(['ADMIN']), roomValidation, async (req: Request, res: Response) => {
  try {
    const { name, capacity, type, floor, building } = req.body;

    const room = await prisma.room.create({
      data: {
        name,
        capacity,
        type,
        floor,
        building,
      },
    });

    res.status(201).json({
      message: 'Room created successfully',
      room,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating room' });
  }
});

// Update room (Admin only)
router.put('/:id', authenticateToken, authorizeRole(['ADMIN']), roomValidation, async (req: Request, res: Response) => {
  try {
    const { name, capacity, type, floor, building } = req.body;

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: {
        name,
        capacity,
        type,
        floor,
        building,
      },
    });

    res.json({
      message: 'Room updated successfully',
      room,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating room' });
  }
});

// Delete room (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), async (req, res) => {
  try {
    await prisma.room.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting room' });
  }
});

// Create room booking
router.post('/:id/book', authenticateToken, bookingValidation, async (req: Request, res: Response) => {
  try {
    const { startTime, endTime, purpose } = req.body;
    const roomId = req.params.id;
    const userId = req.user?.userId;

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check for booking conflicts
    const conflictingBooking = await prisma.roomBooking.findFirst({
      where: {
        roomId,
        OR: [
          {
            AND: [
              { startTime: { lte: new Date(startTime) } },
              { endTime: { gt: new Date(startTime) } },
            ],
          },
          {
            AND: [
              { startTime: { lt: new Date(endTime) } },
              { endTime: { gte: new Date(endTime) } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return res.status(400).json({ message: 'Room is already booked for this time' });
    }

    // Create booking
    const booking = await prisma.roomBooking.create({
      data: {
        roomId,
        userId: userId!,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        purpose,
      },
    });

    return res.status(201).json({
      message: 'Room booked successfully',
      booking,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error booking room' });
  }
});

// Get room bookings
router.get('/:id/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await prisma.roomBooking.findMany({
      where: {
        roomId: req.params.id,
        startTime: {
          gte: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

export default router; 