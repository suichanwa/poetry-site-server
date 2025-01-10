// server/types/lightNovel.types.ts
import { Request } from 'express';

export interface LightNovelCreateData {
  title: string;
  description: string;
  coverImage?: string;
  authorId: number;
  tags: string[];
}

export interface LightNovelChapterData {
  title: string;
  content: string;
  orderIndex: number;
  lightNovelId: number;
}

export interface AuthRequest extends Request {
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  file?: Express.Multer.File;
}

export interface LightNovelResponse {
  id: number;
  title: string;
  description: string;
  coverImage?: string;
  author: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  tags: {
    name: string;
  }[];
  chapters: {
    id: number;
    title: string;
    orderIndex: number;
    content: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  views: number;
  likes: number;
}