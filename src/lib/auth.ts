// Fixed credentials for NEXTRON-2026 admin and coordinator logins.

export type Session =
  | { role: "admin" }
  | { role: "coordinator"; event: string; name: string };

export const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "nextron@2026",
};

// One coordinator account per event. `event` must match the event name used
// in registrations (see Events.tsx).
export const COORDINATOR_ACCOUNTS: {
  username: string;
  password: string;
  event: string;
  name: string;
}[] = [
  { username: "paper", password: "paper@2026", event: "Paper Presentation", name: "Paper Presentation Coordinator" },
  { username: "project", password: "project@2026", event: "Project Expo", name: "Project Expo Coordinator" },
  { username: "codedebug", password: "code@2026", event: "Code Debugging", name: "Code Debugging Coordinator" },
  { username: "techquiz", password: "techquiz@2026", event: "Tech Quiz", name: "Tech Quiz Coordinator" },
  { username: "logodesign", password: "logo@2026", event: "Logo Design", name: "Logo Design Coordinator" },
  { username: "ideathon", password: "ideathon@2026", event: "Ideathon", name: "Ideathon Coordinator" },
  { username: "webdesign", password: "web@2026", event: "Web Design", name: "Web Design Coordinator" },
  { username: "electrocharades", password: "electro@2026", event: "Electro Charades", name: "Electro Charades Coordinator" },
  { username: "aivideo", password: "aivideo@2026", event: "AI Video Animation & Generation", name: "AI Video Animation Coordinator" },
  { username: "freefire", password: "freefire@2026", event: "Free Fire", name: "Free Fire Coordinator" },
  { username: "bgmi", password: "bgmi@2026", event: "BGMI", name: "BGMI Coordinator" },
  { username: "photo", password: "photo@2026", event: "Photography", name: "Photography Coordinator" },
  { username: "treasure", password: "treasure@2026", event: "Treasure Hunt", name: "Treasure Hunt Coordinator" },
  { username: "reels", password: "reels@2026", event: "Reels Making", name: "Reels Making Coordinator" },
  { username: "meme", password: "meme@2026", event: "Meme Making", name: "Meme Making Coordinator" },
  { username: "cinequiz", password: "cine@2026", event: "Cine Quiz", name: "Cine Quiz Coordinator" },
  { username: "actguess", password: "act@2026", event: "Act & Guess", name: "Act & Guess Coordinator" },
];

export function authenticateAdmin(username: string, password: string): boolean {
  return (
    username.trim() === ADMIN_CREDENTIALS.username &&
    password === ADMIN_CREDENTIALS.password
  );
}

export function authenticateCoordinator(
  username: string,
  password: string,
): Session | null {
  const acc = COORDINATOR_ACCOUNTS.find(
    (a) => a.username === username.trim() && a.password === password,
  );
  return acc
    ? { role: "coordinator", event: acc.event, name: acc.name }
    : null;
}
