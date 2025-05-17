import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const db = require('../config');
const router = express.Router();
const prisma = new PrismaClient();

// Get all notifications
router.get('/', async (_req: Request, res: Response) => {
  try {
    const query = "SELECT * FROM notification";
    const notifications = await db.execute(query);
    return res.status(200).json(notifications[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get a single notification
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const query = "SELECT * FROM notification WHERE notificationID = " + id;

    const notification = await db.execute(query);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    return res.status(200).json(notification[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch notification' });
  }
});

// Create a new notification
router.post('/', async (req: Request, res: Response) => {
  try {
    const { notificationID, userID, message, sentAt, isRead, type } = req.body;

    if(!notificationID || !userID || !message || !sentAt || !isRead || !type ){
        res.status(400).json({ error : "All fields are required"});
    }

    const query = `INSERT INTO notification (notificationID, userID, message, sentAt, type) VALUES (${notificationID}, ${userID}, ${message}, ${sentAt}, ${type})`;

    const notification = await db.execute(query);
    return res.status(201).json({message: "notification added successfully", notification: notification});
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Update a notification
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: req.body
    });
    return res.status(200).json(notification);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Delete a notification
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const notificationID = req.params.id;
    if(!notificationID){
      res.status(401).json({error: "you must enter the notification ID"});
    }
    return res.status(204).json({message: "Notification deleted successfuly"});
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;