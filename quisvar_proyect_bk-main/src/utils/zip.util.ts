import {
  cpSync,
  existsSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
} from 'fs';
import AppError from '@/utils/appError';
import { extname } from 'path';

class ZipUtil {
  public path: string;
  private time = new Date().getTime();
  constructor() {
    this.path = 'compress/prueba';
    this.copyFolder();
    this.gatin();
  }
  private copyFolder() {
    const compressPath = this.path + '_' + this.time;
    cpSync(this.path, compressPath, { recursive: true });
    if (!existsSync(compressPath)) throw new AppError('error en copiar', 500);
    return compressPath;
  }
  public async compressPDF(path: string, isPDF: boolean) {
    try {
      if (!existsSync(path)) throw new AppError('path inexistente', 500);
      const subDir = readdirSync(path);
      let paths: string[] = [];
      const filterDir = subDir.map(async file => {
        const relativePath = path + '/' + file;
        if (statSync(relativePath).isDirectory()) {
          return await this.compressPDF(relativePath, isPDF);
        }
        if (isPDF && extname(relativePath) !== '.pdf') {
          unlinkSync(relativePath);
          paths.push(relativePath);
          return relativePath;
        }
        if (!isPDF && extname(relativePath) === '.pdf') {
          unlinkSync(relativePath);
          paths.push(relativePath);
          return relativePath;
        }

        return undefined;
      });
      const values = await Promise.all(filterDir);
      const parsingValues: unknown[] = values.filter(file => file);
      return { next_path: parsingValues, paths };
    } catch (error) {
      console.log(error);
    }
  }
  public async gatin() {
    const patin = await this.compressPDF(this.copyFolder(), false);
    console.log(patin);
  }
}

export default ZipUtil;
