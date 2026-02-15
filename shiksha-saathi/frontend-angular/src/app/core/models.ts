export interface User {
  id: string;
  name: string;
  email?: string;
  username?: string;
  role: 'admin' | 'teacher' | 'student';
  grade?: number;
  classId?: string;
  sectionId?: string;
  language?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  grade: number;
  teacherId: string;
}

export interface SectionItem {
  id: string;
  classId: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  grade: number;
  language: string;
}
