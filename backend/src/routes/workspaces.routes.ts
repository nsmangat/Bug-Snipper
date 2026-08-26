import { Router } from 'express';
import { listWorkspaces } from '../services/workspaces.service.js';

export const workspacesRouter = Router();

workspacesRouter.get('/', async (_req, res, next) => {
  try {
    const workspaces = await listWorkspaces();
    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
});
