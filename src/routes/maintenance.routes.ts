import express from 'express';
import { Request, Response } from 'express';
const db = require('../config');

const router = express.Router();

// Get all maintenance requests
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Get all maintenance requests
    const [maintenanceRequests] = await db.query('SELECT * FROM maintenancerequest');
    
    // Get all updates for these requests
    const [updates] = await db.query('SELECT * FROM maintenanceupdate');
    
    // Combine the data
    const formattedRequests = maintenanceRequests.map((request: any) => ({
      ...request,
      updates: updates.filter((update: any) => update.requestID === request.requestID)
    }));

    return res.json(formattedRequests);
  } catch (error) {
    return res.status(500).json({ error: error });
  }
});

// Get a single maintenance request
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Get the maintenance request
    const [maintenanceRequests] = await db.query(
      'SELECT * FROM maintenancerequest WHERE requestID = ?',
      [req.params.id]
    );
    
    if (maintenanceRequests.length === 0) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    // Get updates for this request
    const [updates] = await db.query(
      'SELECT * FROM maintenanceupdate WHERE requestID = ?',
      [req.params.id]
    );
    
    // Combine the data
    const formattedRequest = {
      ...maintenanceRequests[0],
      updates: updates
    };
    
    return res.json(formattedRequest);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch maintenance request' });
  }
});

// Create a new maintenance request
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userID, description, photoURL, priority, location, category } = req.body;
    const [result] = await db.query(
      'INSERT INTO maintenancerequest (userID, description, photoURL, priority, location, category) VALUES (?, ?, ?, ?, ?, ?)',
      [userID, description, photoURL, priority, location, category]
    );
    
    const [newMaintenance] = await db.query('SELECT * FROM maintenancerequest WHERE requestID = ?', [result.insertId]);
    return res.status(201).json(newMaintenance[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create maintenance request' });
  }
});

// Update a maintenance request
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { description, photoURL, priority, status, location, category, assignedTo } = req.body;
    await db.query(
      'UPDATE maintenancerequest SET description = ?, photoURL = ?, priority = ?, status = ?, location = ?, category = ?, assignedTo = ? WHERE requestID = ?',
      [description, photoURL, priority, status, location, category, assignedTo, req.params.id]
    );
    
    const [updatedMaintenance] = await db.query('SELECT * FROM maintenancerequest WHERE requestID = ?', [req.params.id]);
    return res.json(updatedMaintenance[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update maintenance request' });
  }
});

// Add maintenance update
router.post('/:id/updates', async (req: Request, res: Response) => {
  try {
    const { userID, comment, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO maintenanceupdate (requestID, userID, comment, status) VALUES (?, ?, ?, ?)',
      [req.params.id, userID, comment, status]
    );
    
    const [newUpdate] = await db.query('SELECT * FROM maintenanceupdate WHERE updateID = ?', [result.insertId]);
    return res.status(201).json(newUpdate[0]);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to add maintenance update' });
  }
});

// Get maintenance updates
router.get('/:id/updates', async (req: Request, res: Response) => {
  try {
    const [updates] = await db.query(
      'SELECT * FROM maintenanceupdate WHERE requestID = ? ORDER BY updatedAt DESC',
      [req.params.id]
    );
    return res.json(updates);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch maintenance updates' });
  }
});

// Delete a maintenance request
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await db.query('DELETE FROM maintenancerequest WHERE requestID = ?', [req.params.id]);
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete maintenance request' });
  }
});

export default router;