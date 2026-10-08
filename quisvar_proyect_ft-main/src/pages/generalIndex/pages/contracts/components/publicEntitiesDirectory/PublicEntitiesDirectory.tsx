import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import './publicEntitiesDirectory.css';

type UnifiedEntity = {
  id: string;
  nombrePrincipal: string;
  ruc: string;
  codigoUeSiaf: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  nivelDeGobierno: string;
  codigoPliego: string;
  pliego: string;
  nombreMef: string;
  titular: string;
  cargo: string;
  alcalde: string;
  cargoAlcalde: string;
  direccion: string;
  direccionMunicipal: string;
  telefonoOCelular: string;
  codigoCiudad: string;
  telefonoMunicipal: string;
  anexo: string;
  anexoMunicipal: string;
  correoElectronico: string;
  paginaWebOficial: string;
  paginaWebMunicipal: string;
  fuenteWeb: string;
  fuenteWebMunicipal: string;
  fuenteContacto: string;
  fuenteDatos: string;
  fuenteMunicipal: string;
  fuenteMef: string;
  validacionCodigo: string;
  validacionCodigoMunicipal: string;
  fuenteCodigoMef: string;
  fuenteCodigoMefMunicipal: string;
  aliases: string[];
  sources: string[];
  sourceRows: Record<'entities' | 'municipalities' | 'mefCatalog', number[]>;
  matchMethods: string[];
  sourceReferenceCount: number;
};

type PublicEntityDataset = {
  metadata: {
    title: string;
    sourceFile: string;
    sourceNotesFile: string;
    importedRecords: number;
    unification: {
      sourceRecords: number;
      unifiedRecords: number;
      consolidatedReferences: number;
      primaryKey: string;
    };
  };
  unifiedEntities: UnifiedEntity[];
};

type EntityField = keyof Pick<UnifiedEntity,
  'nombrePrincipal' | 'ruc' | 'codigoUeSiaf' | 'ubigeo' | 'departamento' | 'provincia' | 'distrito' |
  'nivelDeGobierno' | 'codigoPliego' | 'pliego' | 'nombreMef' | 'titular' | 'cargo' | 'alcalde' |
  'cargoAlcalde' | 'direccion' | 'direccionMunicipal' | 'telefonoOCelular' | 'codigoCiudad' |
  'telefonoMunicipal' | 'anexo' | 'anexoMunicipal' | 'correoElectronico' | 'paginaWebOficial' |
  'paginaWebMunicipal' | 'fuenteWeb' | 'fuenteWebMunicipal' | 'fuenteContacto' | 'fuenteDatos' |
  'fuenteMunicipal' | 'fuenteMef' | 'validacionCodigo' | 'validacionCodigoMunicipal' |
  'fuenteCodigoMef' | 'fuenteCodigoMefMunicipal'>;

type FormField = { name: EntityField; label: string; link?: boolean };
type FormGroup = { title: string; fields: FormField[] };

const FORM_GROUPS: FormGroup[] = [
  {
    title: 'Identificación unificada',
    fields: [
      { name: 'nombrePrincipal', label: 'Nombre de la entidad' }, { name: 'ruc', label: 'RUC' },
      { name: 'codigoUeSiaf', label: 'Código UE / SIAF' }, { name: 'ubigeo', label: 'UBIGEO' },
      { name: 'nivelDeGobierno', label: 'Nivel de gobierno' }, { name: 'departamento', label: 'Departamento' },
      { name: 'provincia', label: 'Provincia' }, { name: 'distrito', label: 'Distrito' },
    ],
  },
  {
    title: 'Autoridades y contacto',
    fields: [
      { name: 'titular', label: 'Titular PTE' }, { name: 'cargo', label: 'Cargo del titular' },
      { name: 'alcalde', label: 'Alcalde' }, { name: 'cargoAlcalde', label: 'Cargo municipal' },
      { name: 'direccion', label: 'Dirección PTE' }, { name: 'direccionMunicipal', label: 'Dirección municipal' },
      { name: 'telefonoOCelular', label: 'Teléfono o celular PTE' }, { name: 'codigoCiudad', label: 'Código de ciudad' },
      { name: 'telefonoMunicipal', label: 'Teléfono municipal' }, { name: 'anexo', label: 'Anexo PTE' },
      { name: 'anexoMunicipal', label: 'Anexo municipal' }, { name: 'correoElectronico', label: 'Correo electrónico' },
      { name: 'paginaWebOficial', label: 'Página web PTE', link: true },
      { name: 'paginaWebMunicipal', label: 'Página web municipal', link: true },
    ],
  },
  {
    title: 'Clasificación MEF',
    fields: [
      { name: 'codigoPliego', label: 'Código de pliego' }, { name: 'pliego', label: 'Pliego' },
      { name: 'nombreMef', label: 'Nombre MEF' }, { name: 'validacionCodigo', label: 'Validación del código PTE' },
      { name: 'validacionCodigoMunicipal', label: 'Validación del código municipal' },
    ],
  },
  {
    title: 'Fuentes originales',
    fields: [
      { name: 'fuenteWeb', label: 'Fuente web PTE', link: true },
      { name: 'fuenteWebMunicipal', label: 'Fuente web municipal', link: true },
      { name: 'fuenteContacto', label: 'Fuente de contacto' }, { name: 'fuenteDatos', label: 'Fuente de datos' },
      { name: 'fuenteMunicipal', label: 'Fuente municipal', link: true }, { name: 'fuenteMef', label: 'Fuente MEF', link: true },
      { name: 'fuenteCodigoMef', label: 'Fuente del código MEF en PTE', link: true },
      { name: 'fuenteCodigoMefMunicipal', label: 'Fuente del código MEF municipal', link: true },
    ],
  },
];

const ALL_FIELDS = FORM_GROUPS.flatMap(group => group.fields);
const RECORDS_PER_PAGE = 25;
const ENTITY_CHANGES_STORAGE_KEY = 'crm-dhyrium-unified-public-entities-v1';

const EMPTY_ENTITY: UnifiedEntity = {
  id: '', nombrePrincipal: '', ruc: '', codigoUeSiaf: '', ubigeo: '', departamento: '', provincia: '', distrito: '',
  nivelDeGobierno: '', codigoPliego: '', pliego: '', nombreMef: '', titular: '', cargo: '', alcalde: '',
  cargoAlcalde: '', direccion: '', direccionMunicipal: '', telefonoOCelular: '', codigoCiudad: '',
  telefonoMunicipal: '', anexo: '', anexoMunicipal: '', correoElectronico: '', paginaWebOficial: '',
  paginaWebMunicipal: '', fuenteWeb: '', fuenteWebMunicipal: '', fuenteContacto: '', fuenteDatos: '',
  fuenteMunicipal: '', fuenteMef: '', validacionCodigo: '', validacionCodigoMunicipal: '', fuenteCodigoMef: '',
  fuenteCodigoMefMunicipal: '', aliases: [], sources: [], sourceRows: { entities: [], municipalities: [], mefCatalog: [] },
  matchMethods: [], sourceReferenceCount: 1,
};

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
const departmentKey = (value: string) => {
  const normalized = normalize(value);
  return normalized === 'provincia constitucional del callao' ? 'callao' : normalized;
};
const countLabel = (value: number) => new Intl.NumberFormat('es-PE').format(value);
const locationValue = (entity: UnifiedEntity) => [entity.departamento, entity.provincia, entity.distrito].filter(Boolean).join(' · ') || '—';
const representativeValue = (entity: UnifiedEntity) => entity.alcalde || entity.titular || '—';
const addressValue = (entity: UnifiedEntity) => entity.direccionMunicipal || entity.direccion || '—';

const UnifiedEntityForm = ({ entity, onCancel, onSave }: {
  entity?: UnifiedEntity;
  onCancel: () => void;
  onSave: (entity: UnifiedEntity) => void;
}) => {
  const [form, setForm] = useState<UnifiedEntity>(entity ?? EMPTY_ENTITY);

  useEffect(() => setForm(entity ?? EMPTY_ENTITY), [entity]);

  const handleChange = ({ target }: ChangeEvent<HTMLInputElement>) => {
    const field = target.name as EntityField;
    setForm(current => ({ ...current, [field]: target.value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.nombrePrincipal.trim()) return;
    onSave({
      ...form,
      nombrePrincipal: form.nombrePrincipal.trim(),
      id: form.id || `entidad-unificada-manual-${Date.now()}`,
      sources: form.sources.length ? form.sources : ['CRM Dhyrium'],
      matchMethods: form.matchMethods.length ? form.matchMethods : ['Registro manual'],
    });
  };

  return <form className="public-entity-form" onSubmit={handleSubmit}>
    <div className="public-entity-dialog-title"><div><p>FICHA ÚNICA</p><h2>{form.id ? 'Actualizar entidad pública' : 'Registrar entidad pública'}</h2><span>Los datos PTE, municipales y MEF se administran en una sola ficha.</span></div></div>
    {FORM_GROUPS.map(group => <fieldset key={group.title}><legend>{group.title}</legend><div className="public-entity-fields">{group.fields.map(field => <label key={field.name}>{field.label}<input name={field.name} value={form[field.name]} onChange={handleChange} required={field.name === 'nombrePrincipal'} /></label>)}</div></fieldset>)}
    <div className="public-entity-dialog-actions"><button type="button" onClick={onCancel}>Cancelar</button><button type="submit">Guardar ficha</button></div>
  </form>;
};

export const PublicEntitiesDirectory = () => {
  const [entities, setEntities] = useState<UnifiedEntity[]>([]);
  const [metadata, setMetadata] = useState<PublicEntityDataset['metadata'] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<UnifiedEntity | null>(null);
  const [editingEntity, setEditingEntity] = useState<UnifiedEntity | undefined>();

  useEffect(() => {
    let isCurrent = true;
    fetch('/data/entidades-publicas-peru-2026.json')
      .then(response => {
        if (!response.ok) throw new Error('No se pudo cargar el directorio unificado.');
        return response.json() as Promise<PublicEntityDataset>;
      })
      .then(dataset => {
        if (!isCurrent) return;
        let localChanges: Record<string, UnifiedEntity> = {};
        try {
          localChanges = JSON.parse(localStorage.getItem(ENTITY_CHANGES_STORAGE_KEY) ?? '{}') as Record<string, UnifiedEntity>;
        } catch {
          localChanges = {};
        }
        const sourceIds = new Set(dataset.unifiedEntities.map(entity => entity.id));
        const manualEntities = Object.values(localChanges).filter(entity => !sourceIds.has(entity.id));
        setEntities([...manualEntities, ...dataset.unifiedEntities.map(entity => localChanges[entity.id] ?? entity)]);
        setMetadata(dataset.metadata);
      })
      .catch(() => isCurrent && setLoadError('No fue posible cargar la base unificada de entidades públicas.'));
    return () => { isCurrent = false; };
  }, []);

  const departments = useMemo(() => {
    const options = new Map<string, string>();
    entities.forEach(entity => {
      if (!entity.departamento) return;
      const key = departmentKey(entity.departamento);
      const currentLabel = options.get(key);
      const hasNaturalCapitalization = entity.departamento !== entity.departamento.toLocaleUpperCase('es-PE');
      if (!currentLabel || (currentLabel === currentLabel.toLocaleUpperCase('es-PE') && hasNaturalCapitalization)) {
        options.set(key, entity.departamento);
      }
    });
    return [...options.entries()].sort((first, second) => first[1].localeCompare(second[1], 'es'));
  }, [entities]);
  const filteredEntities = useMemo(() => {
    const normalizedSearch = normalize(search.trim());
    return entities.filter(entity => {
      const matchesDepartment = !department || departmentKey(entity.departamento) === department;
      const searchable = [...ALL_FIELDS.map(field => entity[field.name]), ...entity.aliases, ...entity.sources].join(' ');
      return matchesDepartment && (!normalizedSearch || normalize(searchable).includes(normalizedSearch));
    });
  }, [department, entities, search]);
  const pages = Math.max(1, Math.ceil(filteredEntities.length / RECORDS_PER_PAGE));
  const visibleEntities = filteredEntities.slice((page - 1) * RECORDS_PER_PAGE, page * RECORDS_PER_PAGE);
  const entitiesWithRuc = filteredEntities.filter(entity => Boolean(entity.ruc)).length;

  const openNewEntity = () => { setEditingEntity(undefined); setIsFormOpen(true); };
  const saveEntity = (entity: UnifiedEntity) => {
    setEntities(current => current.some(item => item.id === entity.id)
      ? current.map(item => item.id === entity.id ? entity : item)
      : [entity, ...current]);
    try {
      const currentChanges = JSON.parse(localStorage.getItem(ENTITY_CHANGES_STORAGE_KEY) ?? '{}') as Record<string, UnifiedEntity>;
      localStorage.setItem(ENTITY_CHANGES_STORAGE_KEY, JSON.stringify({ ...currentChanges, [entity.id]: entity }));
    } catch {
      // La base importada continúa disponible si el navegador bloquea el almacenamiento local.
    }
    setIsFormOpen(false);
    setSelectedEntity(entity);
  };
  const editSelectedEntity = () => {
    if (!selectedEntity) return;
    setEditingEntity(selectedEntity);
    setSelectedEntity(null);
    setIsFormOpen(true);
  };

  return <section className="public-entities-directory">
    <header className="public-entities-header"><div><p>BASE DE DATOS · ENTIDADES PÚBLICAS</p><h1>Directorio unificado</h1><span>Una entidad y una ficha con los datos combinados de PTE, Municipalidades y MEF.</span></div><button type="button" onClick={openNewEntity}>Registrar entidad pública</button></header>
    <section className="public-entities-table-card"><div className="public-entities-toolbar"><label>Buscar entidad, RUC, código o ubicación<input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar en la ficha unificada" /></label><label>Departamento<select value={department} onChange={event => { setDepartment(event.target.value); setPage(1); }}><option value="">Todos los departamentos</option>{departments.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      {loadError ? <p className="public-entities-feedback">{loadError}</p> : !metadata ? <p className="public-entities-feedback">Unificando el directorio…</p> : <><div className="public-entities-result"><span>{countLabel(filteredEntities.length)} entidades unificadas · {countLabel(entitiesWithRuc)} con RUC</span><span>{countLabel(metadata.unification.sourceRecords)} registros fuente consolidados</span></div><div className="public-entities-table"><div className="public-entities-table-head"><span>Entidad</span><span>RUC</span><span>Ubicación</span><span>Alcalde o representante</span><span>Dirección</span><span /></div>{visibleEntities.map(entity => <div className="public-entities-table-row" key={entity.id}><strong>{entity.nombrePrincipal}</strong><span>{entity.ruc || 'No consignado'}</span><span>{locationValue(entity)}</span><span>{representativeValue(entity)}</span><span>{addressValue(entity)}</span><button type="button" onClick={() => setSelectedEntity(entity)}>Ver ficha</button></div>)}</div>{!visibleEntities.length && <p className="public-entities-feedback">No hay entidades que coincidan con los filtros.</p>}<div className="public-entities-pagination"><span>Página {Math.min(page, pages)} de {pages}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Anterior</button><button type="button" disabled={page >= pages} onClick={() => setPage(current => current + 1)}>Siguiente</button></div></div></>}</section>
    {isFormOpen && <div className="public-entity-dialog-backdrop" role="presentation"><UnifiedEntityForm entity={editingEntity} onCancel={() => setIsFormOpen(false)} onSave={saveEntity} /></div>}
    {selectedEntity && <div className="public-entity-dialog-backdrop" role="presentation"><section className="public-entity-detail"><div className="public-entity-dialog-title"><div><p>FICHA ÚNICA DE ENTIDAD PÚBLICA</p><h2>{selectedEntity.nombrePrincipal}</h2><span>{selectedEntity.ruc ? `RUC ${selectedEntity.ruc}` : selectedEntity.codigoUeSiaf ? `Código UE/SIAF ${selectedEntity.codigoUeSiaf}` : 'Sin identificador publicado'}</span></div><div className="public-entity-source-badges">{selectedEntity.sources.map(source => <span key={source}>{source}</span>)}</div></div><div className="public-entity-detail-grid">{ALL_FIELDS.map(field => { const value = selectedEntity[field.name]; return <div key={field.name}><dt>{field.label}</dt><dd>{value ? field.link && /^https?:\/\//.test(value) ? <a href={value} target="_blank" rel="noreferrer">Abrir enlace</a> : value : '—'}</dd></div>; })}</div><section className="public-entity-trace"><h3>Trazabilidad de la unificación</h3><p>{selectedEntity.sourceReferenceCount} registros de origen consolidados.</p><dl><div><dt>Entidades públicas</dt><dd>{selectedEntity.sourceRows.entities.join(', ') || '—'}</dd></div><div><dt>Municipalidades</dt><dd>{selectedEntity.sourceRows.municipalities.join(', ') || '—'}</dd></div><div><dt>Catálogo MEF</dt><dd>{selectedEntity.sourceRows.mefCatalog.join(', ') || '—'}</dd></div><div><dt>Criterios aplicados</dt><dd>{selectedEntity.matchMethods.join(' · ')}</dd></div></dl></section><div className="public-entity-dialog-actions"><button type="button" onClick={() => setSelectedEntity(null)}>Cerrar</button><button type="button" onClick={editSelectedEntity}>Editar ficha</button></div></section></div>}
  </section>;
};
