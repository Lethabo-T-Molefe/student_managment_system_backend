import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all timetables
router.get('/', async (_req: Request, res: Response) => {
  try {
    const timetables = await prisma.timetable.findMany();
    return res.json(timetables);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch timetables' });
  }
});

// Get a single timetable
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const timetable = await prisma.timetable.findUnique({
      where: { id: req.params.id }
    });
    
    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    return res.status(200).json(timetable);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Create a new timetable
router.post('/', async (req: Request, res: Response) => {
  try {
    const timetable = await prisma.timetable.create({
      data: req.body
    });
    return res.status(201).json(timetable);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create timetable' });
  }
});

// Update a timetable
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const timetable = await prisma.timetable.update({
      where: { id: req.params.id },
      data: req.body
    });
    return res.status(200).json(timetable);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update timetable' });
  }
});

// Delete a timetable
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.timetable.delete({
      where: { id: req.params.id }
    });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete timetable' });
  }
});

export default router;