export interface BroadcastGroup {
    id: string;
    teacherId: string;
    teacherName: string; // Denormalized for display
    name: string;
    description?: string;
    inviteCode: string;
    lastMessageId?: string;
    lastMessagePreview?: string;
    lastMessageAt?: string; // ISO String
    memberCount: number;
    createdAt: string; // ISO String
    bannerImage?: string; // Optional branding
    hasUnread?: boolean; // Client-side computed
}

export interface BroadcastMessage {
    id: string;
    groupId: string;
    content: string;
    type: 'text' | 'image' | 'file';
    attachmentUrl?: string; // For image/file
    attachmentName?: string; // For file
    createdAt: string; // ISO String
    readByCount?: number; // Optional analytics
}

export interface BroadcastMember {
    id: string; // groupId_studentId
    groupId: string;
    studentId: string;
    joinedAt: string;
    lastReadMessageId?: string;
    notificationsEnabled: boolean;
}
