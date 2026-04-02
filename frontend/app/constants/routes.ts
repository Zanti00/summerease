export const ROUTES = {
  auth: {
    login: "login",
    register: "signup",
    forgotPassword: "forgot-password",
    resetPassword: "reset-password",
  },
  documents: {
    root: "/documents",
  },
} as const;

export const PROTECTED_ROUTES: string[] = [];

export const AUTH_ROUTES: string[] = [
  ROUTES.auth.login,
  ROUTES.auth.register,
  ROUTES.auth.forgotPassword,
  ROUTES.auth.resetPassword,
];

export const DEFAULT_LOGIN_REDIRECT = ROUTES.documents.root;
