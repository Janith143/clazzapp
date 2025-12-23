export interface Notification {
    id: string;
    teacherId: string;
    teacherName: string;
    teacherAvatar: string;
    content: string;
    target: 'all_followers' | { type: 'class', classId: number, className: string };
    createdAt: string; // ISO String
    recipientCount: number;
}
