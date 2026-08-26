import { Profession } from '@/types/profession';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const PROFESSIONS_DIR = 'jsonData';
const PROFESSIONS_FILE = `${PROFESSIONS_DIR}/professions.json`;
const DEFAULT_PROFESSIONS: Profession[] = [
  { value: 'intern', label: 'Practicante', abrv: 'PRA', amount: 0 },
  { value: 'bachelor', label: 'Bachiller', abrv: 'BACH', amount: 0 },
  { value: 'graduate', label: 'Egresado', abrv: 'EGR', amount: 0 },
  { value: 'professional', label: 'Titulado', abrv: 'TIT', amount: 0 },
];

class ProfessionService {
  private ensureProfessionFile() {
    if (!existsSync(PROFESSIONS_DIR)) {
      mkdirSync(PROFESSIONS_DIR, { recursive: true });
    }

    if (!existsSync(PROFESSIONS_FILE)) {
      writeFileSync(
        PROFESSIONS_FILE,
        JSON.stringify(DEFAULT_PROFESSIONS, null, 3),
        'utf-8'
      );
    }
  }

  get professions(): Profession[] {
    this.ensureProfessionFile();
    const json_profession = readFileSync(PROFESSIONS_FILE, 'utf-8');
    const professions = JSON.parse(json_profession);
    return professions;
  }

  find(id: string) {
    const findProfession = this.professions.find(({ value }) => value === id);
    return findProfession || { label: 'unknow', value: 'unknow', amount: 0 };
  }

  userWithProfession(users: { [key: string]: any }[]) {
    const newUsers = users.map(user => {
      const findProfession = this.find(user.profile.job);
      const profile = {
        ...user.profile,
        job: findProfession,
      };
      return { ...user, profile };
    });
    return newUsers;
  }
  create({ abrv, label, amount }: Profession) {
    const newProfession = {
      value: uuidv4(),
      abrv,
      label,
      amount,
    };
    const professions = this.professions;
    professions.push(newProfession);
    const json_profession = JSON.stringify(professions, null, 3);
    writeFileSync(PROFESSIONS_FILE, json_profession, 'utf-8');
    return newProfession;
  }

  delete(id: string) {
    const professions = this.professions;
    const filterProfession = professions.filter(({ value }) => value !== id);
    const json_profession = JSON.stringify(filterProfession);
    writeFileSync(PROFESSIONS_FILE, json_profession, 'utf-8');
    return this.professions;
  }

  update({ abrv, label, value, amount }: Profession) {
    const professions = this.professions;
    const updateProfession = professions.map(profession =>
      profession.value === value
        ? { ...profession, abrv, label, amount }
        : profession
    );
    const json_profession = JSON.stringify(updateProfession, null, 3);
    writeFileSync(PROFESSIONS_FILE, json_profession, 'utf-8');
    return updateProfession;
  }
}

export default new ProfessionService();
