import express from 'express';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const router = express.Router();
const prisma = new PrismaClient();

// Get all maintenance requests
router.get('/', async (_req: Request, res: Response) => {
  try {
    const maintenanceRequests = await prisma.maintenance.findMany();
    return res.json(maintenanceRequests);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch maintenance requests' });
  }
});

// Get a single maintenance request
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const maintenanceRequest = await prisma.maintenance.findUnique({
      where: { id: req.params.id }
    });
    
    if (!maintenanceRequest) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }
    
    return res.json(maintenanceRequest);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch maintenance request' });
  }
});

// Create a new maintenance request
router.post('/', async (req: Request, res: Response) => {
  try {
    const maintenanceRequest = await prisma.maintenance.create({
      data: req.body
    });
    return res.status(201).json(maintenanceRequest);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create maintenance request' });
  }
});

// Update a maintenance request
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const maintenanceRequest = await prisma.maintenance.update({
      where: { id: req.params.id },
      data: req.body
    });
    return res.json(maintenanceRequest);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update maintenance request' });
  }
});

// Delete a maintenance request
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.maintenance.delete({
      where: { id: req.params.id }
    });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete maintenance request' });
  }
});

export default router;