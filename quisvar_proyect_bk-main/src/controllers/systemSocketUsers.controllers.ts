import { ControllerFunction } from '@/types/patterns';
import OnlinePresenceService, {
  OnlinePresenceFilters,
  OnlinePresenceSortBy,
  OnlinePresenceSortDir,
} from '@/services/onlinePresence.services';

const validSortBy = new Set<OnlinePresenceSortBy>([
  'fullName',
  'email',
  'connections',
  'connectedAt',
  'lastConnectionAt',
]);

const validSortDir = new Set<OnlinePresenceSortDir>(['asc', 'desc']);

const singleQueryValue = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] || '');
  if (typeof value === 'string') return value;
  return undefined;
};

const numberQueryValue = (value: unknown) => {
  const parsed = Number(singleQueryValue(value));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const booleanQueryValue = (value: unknown) => {
  const parsed = singleQueryValue(value);
  return parsed === 'true' ? true : undefined;
};

const parseFilters = (
  query: Record<string, unknown>
): OnlinePresenceFilters => {
  const sortBy = singleQueryValue(query.sortBy) as
    | OnlinePresenceSortBy
    | undefined;
  const sortDir = singleQueryValue(query.sortDir) as
    | OnlinePresenceSortDir
    | undefined;

  return {
    search: singleQueryValue(query.search),
    userId: numberQueryValue(query.userId),
    office: singleQueryValue(query.office),
    role: singleQueryValue(query.role),
    multiple: booleanQueryValue(query.multiple),
    room: singleQueryValue(query.room),
    sortBy: sortBy && validSortBy.has(sortBy) ? sortBy : undefined,
    sortDir: sortDir && validSortDir.has(sortDir) ? sortDir : undefined,
    page: numberQueryValue(query.page),
    limit: numberQueryValue(query.limit),
  };
};

export const getSystemSocketUsers: ControllerFunction = async (req, res) => {
  const snapshot = OnlinePresenceService.getSnapshot(
    parseFilters(req.query as Record<string, unknown>)
  );
  res.status(200).json(snapshot);
};
