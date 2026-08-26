import { Files } from '@prisma/client';
import multer from 'multer';
import PathServices, { _contractPath } from '@/services/paths.services';
import AppError from '@/utils/appError';
import { existsSync, mkdirSync } from 'fs';
import { TypeFileUser } from '@/types/types';
import { convertToUtf8 } from '@/utils/tools';
import { parseQueries } from '@/utils/format.server';
import { FileParams } from '@/types/task';
import {
  basicResourceStoredFilename,
  basicResourceStorageKey,
  basicResourceUploadDirectory,
} from '@/modules/basic-resources/basicResources.storage';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  sanitizeTutorialMaterialName,
  TUTORIAL_MATERIAL_ARCHIVE_MAX_BYTES,
  TUTORIAL_MATERIAL_BLOCKED_EXTENSIONS,
  validateTutorialMaterialMetadata,
} from '@/services/tutorialMaterials.policy';

const MAX_SIZE = 1024 * 1000 * 1000 * 1000;
const MAX_VIDEO_TUTORIAL_SIZE = 10 * 1024 * 1024 * 1024;
const VIDEO_TUTORIAL_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/matroska',
  'application/x-matroska',
];
const VIDEO_TUTORIAL_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv'];
const TUTORIAL_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// const FILE_TYPES = ['.rar', '.zip'];
class StorageConfig {
  public ExtNotAllowed: string[] = ['exe', 'bat', 'sh'];

  public setUp(path: string, pattern?: string, name?: string) {
    return multer.diskStorage({
      destination: (req, file, callback) => {
        if (!existsSync(path)) mkdirSync(path, { recursive: true });
        callback(null, path);
      },
      filename: (req, { originalname }, callback) => {
        const ext = originalname.split('.').at(-1);
        try {
          if (this.ExtNotAllowed.includes(`${ext}`)) throw new Error();
          const patt = pattern ? pattern : '$$';
          const parseFileName = Date.now() + patt + originalname;
          const fileName = name ? name : convertToUtf8(parseFileName);
          callback(null, fileName);
        } catch (error) {
          callback(
            new AppError(`Oops! ,extension ${ext} no permitida`, 400),
            ''
          );
        }
      },
    });
  }
  public setUpTutorials(basePath: string, pattern?: string, name?: string) {
    return multer.diskStorage({
      destination: (req, file, callback) => {
        const subfolder = file.fieldname === 'docs' ? 'docs' : '';
        const fullPath = `${basePath}/${subfolder}`;
        if (!existsSync(fullPath)) mkdirSync(fullPath, { recursive: true });
        callback(null, fullPath);
      },
      filename: (req, file, callback) => {
        const { originalname } = file;
        const ext = originalname.split('.').at(-1);
        try {
          if (
            this.ExtNotAllowed.includes(`${ext}`) ||
            TUTORIAL_MATERIAL_BLOCKED_EXTENSIONS.has(`${ext}`.toLowerCase())
          )
            throw new Error();
          if (file.fieldname === 'docs') {
            const safeOriginalName = sanitizeTutorialMaterialName(originalname);
            callback(
              null,
              `${Date.now()}-${randomUUID()}$$${safeOriginalName}`
            );
            return;
          }
          const patt = pattern || '$$';
          const parseFileName = Date.now() + patt + originalname;
          const fileName = name || convertToUtf8(parseFileName);

          callback(null, fileName);
        } catch (error) {
          callback(
            new AppError(`Oops! ,extension ${ext} no permitida`, 400),
            ''
          );
        }
      },
    });
  }
  public setUpTask(
    type: 'task' | 'basic',
    name?: string,
    typeFile?: Files['type']
  ) {
    return multer.diskStorage({
      destination: async function (req, file, callback) {
        try {
          const { id } = req.params;
          const { status } = parseQueries<FileParams>(req.query);
          const _typeFile = status || typeFile;
          let path: string = '';
          if (type === 'task') {
            path = await PathServices.subTask(+id, _typeFile);
          } else {
            path = await PathServices.basicTask(+id, _typeFile);
          }
          if (!existsSync(path)) mkdirSync(path, { recursive: true });
          callback(null, path);
        } catch (error) {
          callback(new AppError(`No se pudo encontrar la ruta`, 404), '');
        }
      },
      filename: async (req, { originalname }, callback) => {
        const ext = path.extname(originalname);
        // const ext = originalname.split('.').at(-1) || '';
        const uniqueSuffix = Date.now();
        try {
          if (this.ExtNotAllowed.includes(ext) || originalname.includes('$$'))
            throw new Error();
          const { id: subtaskId } = req.params;
          const parseFileName =
            subtaskId + '_' + uniqueSuffix + '$$' + originalname;
          const fileName = name ? name : convertToUtf8(parseFileName);
          callback(null, fileName);
        } catch (error) {
          callback(
            new AppError(`Oops! , envie archivos con extension válida`, 400),
            ''
          );
        }
      },
    });
  }

  public setUpWithParam(path: string, name?: string) {
    return multer.diskStorage({
      destination: function (req, file, cb) {
        const { id } = req.params;
        if (!existsSync(path)) mkdirSync(path, { recursive: true });
        const dir = path + '/' + id;
        cb(null, dir);
      },
      filename: async (req, { originalname }, callback) => {
        try {
          const { id } = req.params;
          const ext = originalname.split('.').at(-1);
          if (!['pdf', 'PDF'].includes(`${ext}`)) throw new Error();
          const parseName: string = id + '.' + ext;
          const fileName = name ? name : parseName;
          callback(null, fileName);
        } catch (error) {
          callback(new AppError(`Oops! , archivo sin extension pdf`, 400), '');
        }
      },
    });
  }
}

const BlackList = new StorageConfig().ExtNotAllowed;

const storageFileUser = multer.diskStorage({
  destination: function (req, file, cb) {
    const typeFileUser = req.query.typeFile as TypeFileUser;
    let uploadPath;
    if (typeFileUser) {
      uploadPath = `public/${typeFileUser}`;
    } else {
      uploadPath =
        file.fieldname === 'fileUserDeclaration'
          ? 'public/declaration'
          : `public/cv`;
    }
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, { originalname }, cb) {
    const ext = originalname.split('.').at(-1) || '';
    try {
      if (BlackList.includes(ext)) throw new Error();
      cb(null, convertToUtf8(Date.now() + '$$' + originalname));
    } catch (error) {
      cb(
        new AppError(`Oops! , envie archivos con extension no repetida`, 400),
        ''
      );
    }
  },
});

const storageFileSpecialist = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = 'public/cv';
    if (file.fieldname === 'fileAgreement') {
      uploadPath = `public/agreement`;
    }
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, { originalname }, cb) {
    const ext = originalname.split('.').at(-1) || '';
    try {
      if (BlackList.includes(ext)) throw new Error();
      cb(null, convertToUtf8(Date.now() + '$$' + originalname));
    } catch (error) {
      cb(new AppError(`Oops! ,extension ${ext} no permitida`, 400), '');
    }
  },
});

class Stogares extends StorageConfig {
  public companies: multer.Multer = multer({
    storage: this.setUp('public/img/companies'),
  });

  public consortium: multer.Multer = multer({
    storage: this.setUp('public/img/consortium'),
  });

  public equipment: multer.Multer = multer({
    storage: this.setUp('public/equipment'),
  });

  public trainingSpecialty: multer.Multer = multer({
    storage: this.setUp('public/training'),
  });

  public generalFiles: multer.Multer = multer({
    storage: this.setUp('public/general'),
  });

  public contractFile: multer.Multer = multer({
    storage: this.setUpWithParam('index/contracts'),
  });

  public areaSpecialty: multer.Multer = multer({
    storage: this.setUpWithParam('public/specialty'),
  });

  public videoTutorials: multer.Multer = multer({
    storage: this.setUpTutorials('public/tutorials'),
    limits: { fileSize: MAX_VIDEO_TUTORIAL_SIZE, files: 17 },
    fileFilter: (_req, file, callback) => {
      const ext = file.originalname.split('.').at(-1)?.toLowerCase() || '';
      const isBlocked =
        BlackList.includes(ext) ||
        TUTORIAL_MATERIAL_BLOCKED_EXTENSIONS.has(ext);
      if (isBlocked) {
        callback(new AppError(`Oops! ,extension ${ext} no permitida`, 400));
        return;
      }

      if (file.fieldname === 'url') {
        const isAllowedVideo =
          VIDEO_TUTORIAL_MIME_TYPES.includes(file.mimetype) ||
          VIDEO_TUTORIAL_EXTENSIONS.includes(ext);
        if (!isAllowedVideo) {
          callback(
            new AppError(
              'El video debe ser un archivo MP4, WebM, MOV o MKV',
              400
            )
          );
          return;
        }
      }

      if (file.fieldname === 'docs') {
        const materialError = validateTutorialMaterialMetadata({
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: 0,
        });
        if (materialError) {
          callback(new AppError(materialError, 400));
          return;
        }
      }

      if (file.fieldname === 'miniature') {
        const isAllowedImage =
          TUTORIAL_IMAGE_MIME_TYPES.includes(file.mimetype) ||
          ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
        if (!isAllowedImage) {
          callback(
            new AppError(
              'La miniatura debe ser una imagen PNG, JPG o WebP',
              400
            )
          );
          return;
        }
      }

      callback(null, true);
    },
  });

  public tutorialMaterials: multer.Multer = multer({
    storage: this.setUpTutorials('public/tutorials'),
    limits: {
      fileSize: TUTORIAL_MATERIAL_ARCHIVE_MAX_BYTES,
      files: 15,
    },
    fileFilter: (_req, file, callback) => {
      if (file.fieldname !== 'docs') {
        callback(
          new AppError(`El campo ${file.fieldname} no admite archivos.`, 400)
        );
        return;
      }

      const materialError = validateTutorialMaterialMetadata({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: 0,
      });
      if (materialError) {
        callback(new AppError(materialError, 400));
        return;
      }

      callback(null, true);
    },
  });

  public workStation: multer.Multer = multer({
    storage: this.setUpWithParam('public/workStation'),
  });

  public fileVoucher: multer.Multer = multer({
    storage: this.setUp('public/voucher'),
  });

  public invoices: multer.Multer = multer({
    storage: this.setUp('public/ops'),
  });

  public fileMail: multer.Multer = multer({
    storage: this.setUp('public/mail'),
  });

  public fileGroup: multer.Multer = multer({
    storage: this.setUp('public/groups/daily'),
  });

  public gateControl: multer.Multer = multer({
    storage: this.setUp('public/gate-control'),
  });

  public licenseResolution: multer.Multer = multer({
    storage: this.setUp('public/licenses/resolutions'),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, callback) => {
      const ext = file.originalname.split('.').at(-1)?.toLowerCase();
      const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
      const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (
        (ext && allowedExtensions.includes(ext)) ||
        allowedMimeTypes.includes(file.mimetype)
      ) {
        callback(null, true);
        return;
      }
      callback(
        new AppError('La resolucion debe ser un archivo PDF, JPG o PNG', 400)
      );
    },
  });

  public singImg: multer.Multer = multer({
    storage: this.setUp('public/signs'),
  });

  public upload: multer.Multer = multer({
    storage: this.setUpTask('task'),
    limits: { fileSize: MAX_SIZE },
  });

  public uploadbasic: multer.Multer = multer({
    storage: this.setUpTask('basic'),
    limits: { fileSize: MAX_SIZE },
  });

  public blobFiles: multer.Multer = multer({
    storage: multer.memoryStorage(),
  });

  public fileUser: multer.Multer = multer({
    storage: storageFileUser,
  });

  public fileSpecialist: multer.Multer = multer({
    storage: storageFileSpecialist,
  });

  public basicFiles(type?: Files['type']): multer.Multer {
    return multer({
      storage: this.setUpTask('task', undefined, type),
    });
  }

  public taskFiles(type?: Files['type']): multer.Multer {
    return multer({
      storage: this.setUpTask('task', undefined, type),
    });
  }

  public basicResources(): multer.Multer {
    return multer({
      storage: multer.diskStorage({
        destination: (req, _file, callback) => {
          const projectId = Number(req.params.projectId);
          const stageId = Number(req.params.stageId);
          if (!Number.isInteger(projectId) || !Number.isInteger(stageId)) {
            callback(new AppError('Proyecto o etapa invalida', 400), '');
            return;
          }
          callback(null, basicResourceUploadDirectory(projectId, stageId));
        },
        filename: (req, file, callback) => {
          const projectId = Number(req.params.projectId);
          const stageId = Number(req.params.stageId);
          if (!Number.isInteger(projectId) || !Number.isInteger(stageId)) {
            callback(new AppError('Proyecto o etapa invalida', 400), '');
            return;
          }
          const extension = path
            .extname(file.originalname)
            .slice(1)
            .toLowerCase();
          if (!extension || BlackList.includes(extension)) {
            callback(new AppError('Tipo de archivo no permitido', 400), '');
            return;
          }
          const storageKey = basicResourceStorageKey(
            projectId,
            stageId,
            file.originalname
          );
          callback(null, basicResourceStoredFilename(storageKey));
        },
      }),
      limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 20 },
    });
  }
}

// const storageReportUser = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadPath = `public/reports`;
//     if (!existsSync(uploadPath)) {
//       mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: async (req, file, callback) => {
//     try {
//       const uniqueSuffix = Date.now();
//       const { originalname } = file;
//       if (!originalname.includes('.pdf') || originalname.includes('$'))
//         throw new Error();
//       const nameFile = uniqueSuffix + '$' + originalname;
//       callback(null, convertToUtf8(nameFile));
//     } catch (error) {
//       callback(
//         new AppError(`Oops! , archivo sin extension pdf o contiene "$"`, 404),
//         ''
//       );
//     }
//   },
// });

// const storage = multer.diskStorage({
//   destination: async (req, file, callback) => {
//     try {
//       const { id } = req.params;
//       const _subtask_id = parseInt(id);
//       const status = req.query.status as Files['type'];
//       const path = await PathServices.subTask(_subtask_id, status);
//       callback(null, path);
//     } catch (error) {
//       callback(new AppError(`No se pudo encontrar la ruta`, 404), '');
//     }
//   },
//   filename: async (req, { originalname }, callback) => {
//     const ext = originalname.split('.').at(-1) || '';
//     try {
//       if (BlackList.includes(ext) || originalname.includes('$'))
//         throw new Error();
//       const uniqueSuffix = Date.now();
//       callback(null, convertToUtf8(uniqueSuffix + '$$' + originalname));
//     } catch (error) {
//       callback(
//         new AppError(`Oops! , envie archivos con extension no repetida`, 404),
//         ''
//       );
//     }
//   },
// });

export default new Stogares();

// export const acceptFormData = multer().any();
// export const upload = multer({
//   storage: storage,
//   limits: { fileSize: MAX_SIZE },
// });

// export const uploadFileUser = multer({
//   storage: storageFileUser,
// });

// export const uploadReportUser = multer({
//   storage: storageReportUser,
// });

// export const uploadFileSpecialist = multer({
//   storage: storageFileSpecialist,
// });

// const storageGeneralFiles = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const uploadPath = `public/general`;
//     if (!existsSync(uploadPath)) {
//       mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '$$' + convertToUtf8(file.originalname));
//   },
// });

// const storageFileMail = multer.diskStorage({
//   destination: (req, file, callback) => {
//     try {
//       const uploadPath = `public/mail`;
//       if (!existsSync(uploadPath)) {
//         mkdirSync(uploadPath, { recursive: true });
//       }
//       callback(null, uploadPath);
//     } catch (error) {
//       callback(new AppError(`Oops! ,no existe la ruta`, 404), '');
//     }
//   },
//   filename: (req, file, callback) => {
//     try {
//       const uniqueSuffix = Date.now();
//       const { originalname } = file;
//       if (originalname.includes('$')) throw new Error();
//       const nameFile = uniqueSuffix + '$' + originalname;
//       callback(null, nameFile);
//     } catch (error) {
//       callback(new AppError(`Oops! , archivo contiene "$"`, 404), '');
//     }
//   },
// });

// const storageFileVoucher = multer.diskStorage({
//   destination: (req, file, callback) => {
//     try {
//       const uploadPath = `public/voucher`;
//       if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });
//       callback(null, uploadPath);
//     } catch (error) {
//       callback(new AppError(`Oops! ,no existe la ruta`, 404), '');
//     }
//   },
//   filename: (req, file, callback) => {
//     try {
//       const uniqueSuffix = Date.now();
//       const { originalname } = file;
//       if (originalname.includes('$')) throw new Error();
//       const nameFile = uniqueSuffix + '$' + originalname;
//       callback(null, nameFile);
//     } catch (error) {
//       callback(new AppError(`Oops! , archivo contiene "$"`, 404), '');
//     }
//   },
// });

// export const uploadGeneralFiles = multer({
//   storage: storageGeneralFiles,
// });

// export const uploadFileMail = multer({
//   storage: storageFileMail,
// });
// export const uploadFileVoucher = multer({
//   storage: storageFileVoucher,
// });

// const storageImgCompanies = multer.diskStorage({
//   destination: function (req, file, cb) {
//     let uploadPath = 'public/img/companies';
//     if (!existsSync(uploadPath)) {
//       mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, files, cb) {
//     const { originalname } = files;

//     cb(null, Date.now() + '$$' + originalname);
//   },
// });

// const storageImgConsortium = multer.diskStorage({
//   destination: function (req, file, cb) {
//     let uploadPath = 'public/img/consortium';
//     if (!existsSync(uploadPath)) {
//       mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, files, cb) {
//     const { originalname } = files;
//     cb(null, Date.now() + '$$' + originalname);
//   },
// });

// const storageAddEquipment = multer.diskStorage({
//   destination: function (req, file, cb) {
//     let uploadPath = 'public/equipment';
//     if (!existsSync(uploadPath)) {
//       mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, files, cb) {
//     const { originalname } = files;
//     cb(null, Date.now() + '$$' + originalname);
//   },
// });

// const storageTrainingSpecialty = multer.diskStorage({
//   destination: function (req, file, cb) {
//     let uploadPath = 'public/training';
//     if (!existsSync(uploadPath)) {
//       mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, files, cb) {
//     const { originalname } = files;
//     cb(null, Date.now() + '$$' + originalname);
//   },
// });
// const storageAreaSpecialty = multer.diskStorage({
//   destination: function (req, file, cb) {
//     let uploadPath = 'public/specialty';
//     if (!existsSync(uploadPath)) {
//       mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, files, cb) {
//     const { originalname } = files;
//     cb(null, Date.now() + '$$' + originalname);
//   },
// });

// const storageAddWorkStation = multer.diskStorage({
//   destination: function (req, file, cb) {
//     let uploadPath = 'public/workStation';
//     if (!existsSync(uploadPath)) {
//       mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: function (req, files, cb) {
//     const { originalname } = files;
//     cb(null, Date.now() + '$$' + originalname);
//   },
// });
// const storageContractsFiles = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const { id } = req.params;
//     if (!existsSync(_contractPath)) {
//       mkdirSync(_contractPath, { recursive: true });
//     }
//     cb(null, `${_contractPath}/${id}`);
//   },
//   filename: async (req, file, callback) => {
//     try {
//       // const { fileName } = req.body;
//       const { id } = req.params;
//       const ext = file.originalname.split('.').at(-1);
//       if (!['pdf', 'PDF'].includes(`${ext}`)) throw new Error();
//       const name: string = id + '.' + ext;
//       // const uniqueSuffix = Date.now();
//       // const { originalname } = file;
//       // if (!originalname.includes('.pdf') || originalname.includes('$'))
//       // const fileName = uniqueSuffix + '$' + originalname;
//       callback(null, name);
//     } catch (error) {
//       callback(new AppError(`Oops! , archivo sin extension pdf`, 404), '');
//     }
//   },
// });

// export const uploadFileAreaSpecialty = multer({
//   storage: storageAreaSpecialty,
// });
// export const uploadFileWorkStation = multer({
//   storage: storageAddWorkStation,
// });
// export const uploadFileEquipment = multer({
//   storage: storageAddEquipment,
// });
// export const uploadFileTrainingSpecialty = multer({
//   storage: storageTrainingSpecialty,
// });
// export const uploadFileContracts = multer({
//   storage: storageContractsFiles,
// });
// export const uploadImgCompanies = multer({
//   storage: storageImgCompanies,
// });
// export const uploadImgConsortium = multer({
//   storage: storageImgConsortium,
// });
// export const uploadFile = (req: Request, res: Response, next: NextFunction) => {
//   try {
//     res.status(200).json({ message: 'Archivo subido exitosamente' });
//   } catch (error) {
//     next(error);
//   }
// };
