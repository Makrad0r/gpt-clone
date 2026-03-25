import { Request } from 'express';

export type RequestUser = {
  id: string;
  email?: string | null;
};

export type RequestAnonymousSession = {
  id: string;
  sessionToken: string;
  questionsUsed: number;
};

export type RequestContext = Request & {
  user?: RequestUser;
  anonymousSession?: RequestAnonymousSession;
};
