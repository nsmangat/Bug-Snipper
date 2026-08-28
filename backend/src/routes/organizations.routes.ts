import { Router } from 'express';
import { z } from 'zod';
import {
  createOrganization,
  listOrganizations,
} from '../services/organizations.service.js';

export const organizationsRouter = Router();

organizationsRouter.get('/', async (_req, res, next) => {
  try {
    const organizations = await listOrganizations();
    res.json({ organizations });
  } catch (err) {
    next(err);
  }
});

const createOrganizationSchema = z.object({
  name: z.string().min(1),
});

organizationsRouter.post('/', async (req, res, next) => {
  const parsed = createOrganizationSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  try {
    const organization = await createOrganization(parsed.data.name);
    res.status(201).json(organization);
  } catch (err) {
    next(err);
  }
});
