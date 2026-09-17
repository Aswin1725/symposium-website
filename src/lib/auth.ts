import { supabase } from "@/lib/supabase";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "coordinator";
  assigned_events: string[];
};

export type Session = {
  token: string;
  user: SessionUser;
};

export const ALL_EVENTS: string[] = [
  "Paper Presentation",
  "Project Expo",
  "Code Debugging",
  "Tech Quiz",
  "Logo Design",
  "Ideathon",
  "Web Design",
  "Electro Charades",
  "AI Video Animation & Generation",
  "Free Fire",
  "BGMI",
  "Photography",
  "Treasure Hunt",
  "Reels Making",
  "Meme Making",
  "Cine Quiz",
  "Act & Guess",
];

const SESSION_STORAGE_KEY = "nextron_session_token";

/**
 * Authenticate against Supabase via app_login RPC.
 * Passwords are never hardcoded and never stored in localStorage/sessionStorage.
 */
export async function loginUser(
  login: string,
  password: string,
): Promise<{ success: boolean; error?: string; session?: Session }> {
  try {
    const { data, error } = await supabase.rpc("app_login", {
      p_login: login.trim(),
      p_password: password,
    });

    if (error) {
      console.error("Login RPC error:", error);
      return { success: false, error: error.message || "Failed to login" };
    }

    if (!data || !data.success) {
      return {
        success: false,
        error: data?.error || "Invalid username/email or password",
      };
    }

    const session: Session = {
      token: data.token,
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        assigned_events: data.user.assigned_events || [],
      },
    };

    // Save token only (never credentials) to sessionStorage
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, session.token);
    } catch {
      // sessionStorage may fail in private mode
    }

    return { success: true, session };
  } catch (err) {
    console.error("Login unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }
}

/**
 * Validates the current session token with the database.
 */
export async function validateSession(
  token?: string | null,
): Promise<Session | null> {
  const tokenToValidate =
    token ||
    (typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(SESSION_STORAGE_KEY)
      : null);

  if (!tokenToValidate) return null;

  try {
    const { data, error } = await supabase.rpc("app_validate_session", {
      p_token: tokenToValidate,
    });

    if (error || !data || !data.valid) {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {}
      return null;
    }

    return {
      token: tokenToValidate,
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        assigned_events: data.user.assigned_events || [],
      },
    };
  } catch {
    return null;
  }
}

/**
 * Logout and invalidate session in database.
 */
export async function logoutUser(token?: string | null): Promise<void> {
  const tokenToClear =
    token ||
    (typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(SESSION_STORAGE_KEY)
      : null);

  if (tokenToClear) {
    try {
      await supabase.rpc("app_logout", { p_token: tokenToClear });
    } catch (err) {
      console.warn("Error calling app_logout:", err);
    }
  }

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}
