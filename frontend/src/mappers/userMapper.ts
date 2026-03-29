import { UserListenerData } from '../../types/dataTypes';

// Raw shape returned by the backend UserDTO
interface UserApiResponse {
  id: string;
  name: string;
  avatar: string | null;
  song_id: string | null;
  song_title: string | null;
  song_artist: string | null;
  song_image: string | null;
}

function calculateTimeAgo(timestamp: string | undefined): string {
  if (!timestamp) return 'Just now';
  const diffInSeconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

export function mapUserDtoToUserListenerData(dto: UserApiResponse): UserListenerData {
  return {
    id: dto.id,
    name: dto.name,
    avatar: dto.avatar ?? '',
    currentTrack: {
      id: dto.song_id ?? '',
      title: dto.song_title ?? '',
      artist: dto.song_artist ?? '',
      albumArt: dto.song_image ?? '',
      isCurrentlyListening: true,
      timestamp: calculateTimeAgo(undefined),
    },
  };
}

export function mapUserDtoArray(dtos: UserApiResponse[]): UserListenerData[] {
  return dtos.map(mapUserDtoToUserListenerData);
}
