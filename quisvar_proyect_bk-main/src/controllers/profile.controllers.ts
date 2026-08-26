import { Request, Response } from 'express';
import ProfileServices from '@/services/profile.services';
import UsersServices from '@/services/users.services';
import { UserType } from '@/middlewares/auth.middleware';

export const showProfile = async (req: Request, res: Response) => {
  const userInfo: UserType = res.locals.userInfo;
  const { id } = userInfo;
  const query = await UsersServices.find(id);
  res.status(200).json(query);
};

export const downloadProfile = async (req: Request, res: Response) => {
  // const dirSplit = __dirname.split('\\');
  // console.log(__dirname);
  // const dirPath = dirSplit.slice(0, dirSplit.length - 2).join('/');
  // const folder = '/files';
  // // const newDirPath = dirPath + folder + '/Vector.rar';
  res.download('./files/Vector.rar', err => {
    console.log(err);
    res.status(404).json(err);
  });
  // res.json({ message: newDirPath });
};

export const uploadProfile = async (_req: Request, _res: Response) => {
  console.log('patito');
};

export const updateProfile = async (req: Request, res: Response) => {
  const {
    ruc,
    address,
    roleId,
    email,
    userType,
    payrollContractStartDate,
    payrollContractEndDate,
    payrollMonthlySalary,
    payrollContractType,
    ...profile
  } = req.body;
  const { id } = req.params;
  const dataUser = {
    ruc,
    address,
    roleId,
    email,
    userType,
    payrollContractStartDate,
    payrollContractEndDate,
    payrollMonthlySalary,
    payrollContractType,
  };
  const query = await ProfileServices.update(+id, profile, dataUser);
  res.status(201).json(query);
};
