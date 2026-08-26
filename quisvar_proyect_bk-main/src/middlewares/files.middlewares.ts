import type { Request, Response } from 'express';
import FilesServices from '@/services/files.services';

export const verifyFiles = async (req: Request, res: Response) => {
  const { id } = req.params;
  const _subtask_id = parseInt(id);
  if (!req.file) return res.json('patito');
  const { filename } = req.file;
  console.log(filename, '<==');
  // const extFileUpload = filename.split;
  const files = await FilesServices.findBySubTask(_subtask_id, 'REVIEW');
  const filesList = files.map(f => ({
    id: f.id,
    name: f.name.split('.').at(-1),
  }));
  res.json(filesList);
};
