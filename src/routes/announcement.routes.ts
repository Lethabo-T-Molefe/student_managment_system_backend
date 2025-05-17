import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();
const db = require('../config');

// Get all announcements
router.get('/', async (_req: Request, res: Response) => {
  try {
    const query = "SELECT * FROM announcement";
    const announcements = await db.execute(query);
    return res.status(200).json(announcements[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Get a single announcement
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const query = "SELECT * FROM announcement WHERE announcementID = " + id;
    const [announcement] = await db.execute(query);
    
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    return res.status(200).json(announcement);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch announcement' });
  }
});

// Create a new announcement
router.post('/', async (req: Request, res: Response) => {
  try {
    const { announcementID, title, content, userID } = req.body;

    console.log("Announcement : ", announcementID);
    console.log("title : ", title);
    console.log("content : ", content);
    console.log("userID : ", userID);
    if(!announcementID || !title || !content || !userID || !userID ){
      res.status(401).json({error: "All fields must be fiiled "});
    }

    const query = `INSERT INTO announcement (announcementID, title, content, userID) VALUES (${announcementID}, "${title}", "${content}", ${userID})`;
    const announcement = await db.execute(query);

    return res.status(201).json({message: "Announcement has been successfully added", announcement : announcement});
  } catch (error) {
    return res.status(500).json({ error: error   });
  }
});
/*
// Update an announcement
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const query = `UPDATE announcement SET `;
    const announcement = await db.execute();
    return res.status(200).json(announcement);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update announcement' });
  }
});*/

// Delete an announcement
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const query = `DELETE FROM announcement WHERE announcementID = ${id}`;
    const [result] = await db.execute(query);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(204).json({ result: result });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;  