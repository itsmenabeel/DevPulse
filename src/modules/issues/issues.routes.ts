import { Router } from 'express';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { createIssue, getAllIssues, getIssueById, updateIssue, deleteIssue } from './issues.controller';

const router = Router();

router.post('/', authenticateToken, createIssue);
router.get('/', authenticateToken, getAllIssues);
router.get('/:id', authenticateToken, getIssueById);
router.patch('/:id', authenticateToken, updateIssue);
router.delete('/:id', authenticateToken, requireRole('maintainer'), deleteIssue);

export default router;
