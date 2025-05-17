import express, { Request, Response } from 'express';
const db = require('../config');

const router = express.Router();

// Get all timetables
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [timetables] = await db.query('SELECT * FROM timetable');
    return res.json(timetables);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch timetables' });
  }
});

// Get a single timetable
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [timetables] = await db.query('SELECT * FROM timetable WHERE timetableID = ?', [req.params.id]);
    
    if (timetables.length === 0) {
      return res.status(404).json({ error: 'Timetable not found' });
    }
    
    return res.status(200).json(timetables[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// Create a new timetable
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userID, course, day, time, endTime, location, instructor } = req.body;
    const [result] = await db.query(
      'INSERT INTO timetable (userID, course, day, time, endTime, location, instructor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userID, course, day, time, endTime, location, instructor]
    );
    
    const [newTimetable] = await db.query('SELECT * FROM timetable WHERE timetableID = ?', [result.insertId]);
    return res.status(201).json(newTimetable[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create timetable' });
  }
});

// Update a timetable
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { userID, course, day, time, endTime, location, instructor } = req.body;
    await db.query(
      'UPDATE timetable SET userID = ?, course = ?, day = ?, time = ?, endTime = ?, location = ?, instructor = ? WHERE timetableID = ?',
      [userID, course, day, time, endTime, location, instructor, req.params.id]
    );
    
    const [updatedTimetable] = await db.query('SELECT * FROM timetable WHERE timetableID = ?', [req.params.id]);
    return res.status(200).json(updatedTimetable[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update timetable' });
  }
});

// Delete a timetable
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await db.query('DELETE FROM timetable WHERE timetableID = ?', [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete timetable' });
  }
});

export default router;