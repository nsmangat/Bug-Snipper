import { Router } from 'express';
import { z } from 'zod';
import { createWorkspace, listWorkspaces } from '../services/workspaces.service.js';

export const workspacesRouter = Router();

workspacesRouter.get('/', async (_req, res, next) => {
  try {
    const workspaces = await listWorkspaces();
    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
});

const createWorkspaceSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
});

workspacesRouter.post('/', async (req, res, next) => {
  const parsed = createWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  try {
    const workspace = await createWorkspace(
      parsed.data.organizationId,
      parsed.data.name,
    );
    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
});
