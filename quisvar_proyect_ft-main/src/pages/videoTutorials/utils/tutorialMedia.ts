import { API_BASE_URL } from '@/services/axiosInstance';

type TutorialMediaKind = 'video' | 'thumbnail' | 'material';

export const tutorialMediaUrl = (
  kind: TutorialMediaKind,
  id: number,
  mediaTicket: string
) =>
  `${API_BASE_URL}/tutorial-media/${kind}/${id}?ticket=${encodeURIComponent(
    mediaTicket
  )}`;
