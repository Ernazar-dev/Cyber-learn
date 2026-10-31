import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { runFuzzyEngine } from '../lib/fuzzyEngine';
import type { FuzzyResult, FuzzyWeights } from '../lib/fuzzyEngine';
import api, { AUTH_EXPIRED_EVENT } from '../lib/api';
import { notify } from '../lib/notify';

interface BackendFuzzyResult {
  score: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  rule1: number;
  rule2: number;
  rule3: number;
}

interface BackendUser {
  id: number;
  name: string;
  username: string;
  age: number;
  role: "Student" | "Teacher";
  diagnosticScore: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  fuzzyScore: number;
  completedModulesCount: number;
  speed: number;
  errors: number;
  hasCompletedInitialTest: boolean;
  hasFuzzyResult: boolean;
  lastFuzzyResult: BackendFuzzyResult | null;
}

interface BackendAuthResponse {
  token: string;
  user: BackendUser;
}

interface BackendModuleProgress {
  id: number;
  title: string;
  unlocked: boolean;
  completed: boolean;
  score: number;
}

interface BackendStudent {
  id: number;
  name: string;
  username: string;
  hasPassword: boolean;
  age: number;
  diagnosticScore: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  fuzzyScore: number;
  completedModulesCount: number;
  speed: number;
  errors: number;
  hasCompletedInitialTest: boolean;
  hasFuzzyResult: boolean;
  lastFuzzyResult: BackendFuzzyResult | null;
  moduleProgress: BackendModuleProgress[] | null;
}

interface BackendAssignmentQuestion {
  id: number;
  question: string;
  options: string[];
  /** Faqat o'qituvchiga keladi — o'quvchi javoblari serverda tekshiriladi */
  correctAnswer?: number;
}

interface BackendAssignment {
  id: number;
  title: string;
  description: string;
  studentId: number;
  studentName: string;
  targetModuleId: number;
  assignmentType: "Nazariy" | "Amaliy";
  completed: boolean;
  dateAssigned: string;
  questions: BackendAssignmentQuestion[] | null;
}

interface BackendLesson {
  id: number;
  title: string;
  description: string;
  content: string;
  category: string;
  difficulty: "Boshlang'ich" | "O'rta" | "Yuqori";
  lessonType: "Nazariy" | "Amaliy";
  videoUrl: string;
  tags: string[] | null;
  createdAt: string;
  readByStudents: number[] | null;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export interface FuzzyMetrics {
  knowledge: number;
  errors: number;
  speed: number;
}

export interface ModuleProgress {
  id: number;
  title: string;
  unlocked: boolean;
  completed: boolean;
  score?: number;
}

export interface AssignmentQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option; o'quvchida -1 (server yubormaydi)
}

/** POST /api/assignments/:id/complete natijasi */
export interface AssignmentResult {
  passed: boolean;
  correct: number;
  total: number;
  completed: boolean;
  /** Shu topshiriq bilan moduldagi barcha savolli topshiriqlar bajarilib, modul tugadi */
  moduleCompleted: boolean;
  message: string;
  /** Server hisoblagan yangi tayyorgarlik darajasi (savolli topshiriqda) */
  assessment?: ServerAssessment | null;
}

/** /api/assessment/submit va topshiriq natijasidagi fuzzy baho */
export interface ServerAssessment extends FuzzyResult {
  knowledge: number;
  errors: number;
  speed: number;
}

export interface Lesson {
  id: number;
  title: string;
  description: string;
  content: string;
  category: string;
  difficulty: "Boshlang'ich" | "O'rta" | "Yuqori";
  lessonType: "Nazariy" | "Amaliy";
  videoUrl: string;
  tags: string[];
  createdAt: string;
  readByStudents: number[];
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
}

export interface Assignment {
  id: number;
  title: string;
  studentId: number;
  studentName: string;
  targetModuleId: number;
  completed: boolean;
  dateAssigned: string;
  questions: AssignmentQuestion[];
  description?: string;
  assignmentType: "Nazariy" | "Amaliy";
}

export interface Student {
  id: number;
  name: string;
  username?: string;
  hasPassword?: boolean;
  age: number;
  diagnosticScore: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  fuzzyScore: number;
  completedModulesCount: number;
  speed: number;
  errors: number;
  hasCompletedInitialTest: boolean;
  moduleProgress: ModuleProgress[];
  lastFuzzyResult: FuzzyResult | null;
}

export interface UserSession {
  id: number;
  name: string;
  age: number;
  role: "Student" | "Teacher";
}

export interface AppState {
  currentUser: UserSession | null;
  token: string | null;
  userRole: "Student" | "Teacher";
  hasCompletedInitialTest: boolean;
  fuzzyMetrics: FuzzyMetrics;
  currentLevel: "Beginner" | "Intermediate" | "Advanced";
  readinessScore: number;
  moduleProgress: ModuleProgress[];
  lastFuzzyResult: FuzzyResult | null;
  fuzzyWeights: FuzzyWeights;
  assignments: Assignment[];
  students: Student[];
  lessons: Lesson[];

  loginUser: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  registerStudent: (name: string, username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  setStudentCredentials: (studentId: number, password: string, username?: string) => Promise<{ success: boolean; message?: string }>;
  logoutUser: () => void;
  verifySession: () => Promise<void>;
  setRole: (role: "Student" | "Teacher") => void;
  /** result — serverning fuzzy natijasi (daraja serverda hisoblanadi); berilmasa lokal hisoblanadi */
  submitAssessment: (metrics: FuzzyMetrics, result?: FuzzyResult) => void;
  completeModule: (moduleId: number, score?: number) => void;
  updateFuzzyWeights: (weights: Partial<FuzzyWeights>) => void;
  fetchFuzzyWeights: () => Promise<void>;
  saveFuzzyWeights: () => Promise<{ success: boolean; message?: string }>;
  fetchStudents: () => Promise<void>;
  fetchAssignments: () => Promise<void>;
  addAssignment: (title: string, studentId: number, targetModuleId: number, questions?: AssignmentQuestion[], description?: string, assignmentType?: "Nazariy" | "Amaliy") => Promise<{ success: boolean; message?: string }>;
  completeAssignment: (assignmentId: number, answers?: number[]) => Promise<{ success: boolean; message?: string; result?: AssignmentResult }>;
  fetchLessons: () => Promise<void>;
  addLesson: (lesson: Omit<Lesson, 'id' | 'createdAt' | 'readByStudents'>) => Promise<{ success: boolean; message?: string }>;
  deleteLesson: (lessonId: number) => Promise<{ success: boolean; message?: string }>;
  markLessonRead: (lessonId: number) => Promise<{ success: boolean; message?: string }>;
  deleteStudent: (studentId: number) => Promise<{ success: boolean; message?: string }>;
  resetProgress: () => void;
}

const initialModules: ModuleProgress[] = [
  { id: 1, title: "Kiberxavfsizlik asoslari", unlocked: true, completed: false },
  { id: 2, title: "Tarmoq xavfsizligi", unlocked: false, completed: false },
  { id: 3, title: "Kriptografiya", unlocked: false, completed: false },
  { id: 4, title: "Tizim himoyasi", unlocked: false, completed: false },
];

const defaultFuzzyWeights: FuzzyWeights = {
  rule1Weight: 0.2,
  rule2Weight: 0.5,
  rule3Weight: 0.9,
  beginnerThreshold: 0.4,
  intermediateThreshold: 0.7,
};

function backendUserToStudent(u: BackendUser, moduleProgress: ModuleProgress[]): Student {
  return {
    id: u.id,
    name: u.name,
    age: u.age,
    diagnosticScore: u.diagnosticScore,
    level: u.level,
    fuzzyScore: u.fuzzyScore,
    completedModulesCount: u.completedModulesCount,
    speed: u.speed,
    errors: u.errors,
    hasCompletedInitialTest: u.hasCompletedInitialTest,
    moduleProgress,
    lastFuzzyResult: u.hasFuzzyResult && u.lastFuzzyResult ? u.lastFuzzyResult : null,
  };
}

function upsertStudent(students: Student[], student: Student): Student[] {
  const idx = students.findIndex(s => s.id === student.id);
  if (idx === -1) return [...students, student];
  const copy = students.slice();
  copy[idx] = student;
  return copy;
}

function backendStudentToStudent(s: BackendStudent): Student {
  return {
    id: s.id,
    name: s.name,
    username: s.username,
    hasPassword: s.hasPassword,
    age: s.age,
    diagnosticScore: s.diagnosticScore,
    level: s.level,
    fuzzyScore: s.fuzzyScore,
    completedModulesCount: s.completedModulesCount,
    speed: s.speed,
    errors: s.errors,
    hasCompletedInitialTest: s.hasCompletedInitialTest,
    moduleProgress: s.moduleProgress ?? [],
    lastFuzzyResult: s.hasFuzzyResult && s.lastFuzzyResult ? s.lastFuzzyResult : null,
  };
}

function backendAssignmentToAssignment(a: BackendAssignment): Assignment {
  return {
    id: a.id,
    title: a.title,
    studentId: a.studentId,
    studentName: a.studentName,
    targetModuleId: a.targetModuleId,
    completed: a.completed,
    dateAssigned: a.dateAssigned.slice(0, 10),
    questions: (a.questions ?? []).map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer ?? -1,
    })),
    description: a.description,
    assignmentType: a.assignmentType,
  };
}

function backendLessonToLesson(l: BackendLesson): Lesson {
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    content: l.content,
    category: l.category,
    difficulty: l.difficulty,
    lessonType: l.lessonType,
    videoUrl: l.videoUrl,
    tags: l.tags ?? [],
    createdAt: l.createdAt,
    readByStudents: l.readByStudents ?? [],
    fileUrl: l.fileUrl,
    fileName: l.fileName,
    fileSize: l.fileSize,
  };
}

const initialState = {
  currentUser: null,
  token: null,
  userRole: "Student" as const,
  hasCompletedInitialTest: false,
  fuzzyMetrics: { knowledge: 0, errors: 0, speed: 0 },
  currentLevel: "Beginner" as const,
  readinessScore: 0,
  moduleProgress: initialModules,
  lastFuzzyResult: null,
  fuzzyWeights: defaultFuzzyWeights,
  assignments: [],
  students: [] as Student[],
  lessons: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      loginUser: async (username, password) => {
        try {
          const data = await api.post<BackendAuthResponse>("/api/auth/login", { username, password });
          const u = data.user;

          if (u.role === "Teacher") {
            set({
              currentUser: { id: u.id, name: u.name, age: u.age, role: "Teacher" },
              userRole: "Teacher",
              token: data.token,
            });
            return { success: true };
          }

          let moduleProgress: ModuleProgress[] = initialModules;
          try {
            moduleProgress = await api.get<BackendModuleProgress[]>("/api/students/me/progress", data.token);
          } catch { /* keep local defaults if this fails */ }

          set((state) => ({
            currentUser: { id: u.id, name: u.name, age: u.age, role: "Student" },
            userRole: "Student",
            token: data.token,
            hasCompletedInitialTest: u.hasCompletedInitialTest,
            currentLevel: u.level,
            readinessScore: u.fuzzyScore,
            fuzzyMetrics: { knowledge: u.diagnosticScore, errors: u.errors, speed: u.speed },
            lastFuzzyResult: u.hasFuzzyResult && u.lastFuzzyResult ? u.lastFuzzyResult : null,
            moduleProgress,
            students: upsertStudent(state.students, backendUserToStudent(u, moduleProgress)),
          }));
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Login yoki parol noto'g'ri!" };
        }
      },

      registerStudent: async (name, username, password) => {
        try {
          const data = await api.post<BackendAuthResponse>("/api/auth/register", { name, username, password });
          const u = data.user;

          let moduleProgress: ModuleProgress[] = initialModules;
          try {
            moduleProgress = await api.get<BackendModuleProgress[]>("/api/students/me/progress", data.token);
          } catch { /* keep local defaults if this fails */ }

          set((state) => ({
            currentUser: { id: u.id, name: u.name, age: u.age, role: "Student" },
            userRole: "Student",
            token: data.token,
            hasCompletedInitialTest: false,
            currentLevel: "Beginner" as const,
            readinessScore: 0,
            lastFuzzyResult: null,
            fuzzyMetrics: { knowledge: 0, errors: 0, speed: 0 },
            moduleProgress,
            students: upsertStudent(state.students, backendUserToStudent(u, moduleProgress)),
          }));
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Ro'yxatdan o'tishda xatolik" };
        }
      },

      logoutUser: () => set({ currentUser: null, token: null }),

      verifySession: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const u = await api.get<BackendUser>("/api/auth/me", token);
          if (u.role !== "Student") return;

          // Re-sync module progress/scores from the backend on every reload —
          // the persisted local snapshot can go stale (e.g. progress made in
          // another browser/session), and this is what the analytics chart reads.
          let moduleProgress: ModuleProgress[] = get().moduleProgress;
          try {
            moduleProgress = await api.get<BackendModuleProgress[]>("/api/students/me/progress", token);
          } catch { /* keep existing local snapshot if this fails */ }

          set((state) => ({
            hasCompletedInitialTest: u.hasCompletedInitialTest,
            currentLevel: u.level,
            readinessScore: u.fuzzyScore,
            fuzzyMetrics: { knowledge: u.diagnosticScore, errors: u.errors, speed: u.speed },
            lastFuzzyResult: u.hasFuzzyResult && u.lastFuzzyResult ? u.lastFuzzyResult : null,
            moduleProgress,
            students: upsertStudent(state.students, backendUserToStudent(u, moduleProgress)),
          }));
        } catch {
          // handleUnauthorized already dispatches AUTH_EXPIRED_EVENT on 401,
          // which triggers logoutUser() via the listener below.
        }
      },
      
      setRole: (role) => set({ userRole: role }),
      
      submitAssessment: (metrics, serverResult) => set((state) => {
        if (!state.currentUser || state.userRole !== "Student") return {};

        const result = serverResult ?? runFuzzyEngine(metrics.knowledge, metrics.errors, metrics.speed, state.fuzzyWeights);
        
        const newModules = state.moduleProgress.map(m => {
          let unlocked = m.unlocked;
          if (result.level === "Beginner") {
            unlocked = m.id === 1;
          } else if (result.level === "Intermediate") {
            unlocked = m.id <= 2;
          } else if (result.level === "Advanced") {
            unlocked = m.id <= 4;
          }
          return { ...m, unlocked: unlocked || m.completed };
        });

        // Update current student record in the students list
        const updatedStudents = state.students.map(s => {
          if (s.id === state.currentUser?.id) {
            return {
              ...s,
              diagnosticScore: metrics.knowledge,
              level: result.level,
              fuzzyScore: result.score,
              completedModulesCount: newModules.filter(m => m.completed).length,
              speed: metrics.speed,
              errors: metrics.errors,
              hasCompletedInitialTest: true,
              moduleProgress: newModules,
              lastFuzzyResult: result
            };
          }
          return s;
        });

        return {
          hasCompletedInitialTest: true,
          fuzzyMetrics: metrics,
          currentLevel: result.level,
          readinessScore: result.score,
          lastFuzzyResult: result,
          moduleProgress: newModules,
          students: updatedStudents,
        };
      }),
      
      completeModule: (moduleId, score) => set((state) => {
        if (!state.currentUser || state.userRole !== "Student") return {};

        const newModules = state.moduleProgress.map(m =>
          m.id === moduleId ? { ...m, completed: true, score: score ?? m.score } : m
        );

        // Update in student array
        const updatedStudents = state.students.map(s => {
          if (s.id === state.currentUser?.id) {
            return {
              ...s,
              completedModulesCount: newModules.filter(m => m.completed).length,
              moduleProgress: newModules,
            };
          }
          return s;
        });

        return {
          moduleProgress: newModules,
          students: updatedStudents,
        };
      }),

      updateFuzzyWeights: (newWeights) => set((state) => {
        const updatedWeights = { ...state.fuzzyWeights, ...newWeights };
        
        // Re-run evaluation for current user if they took the test
        let extraState = {};
        if (state.hasCompletedInitialTest && state.currentUser?.role === "Student") {
          const result = runFuzzyEngine(state.fuzzyMetrics.knowledge, state.fuzzyMetrics.errors, state.fuzzyMetrics.speed, updatedWeights);
          
          const newModules = state.moduleProgress.map(m => {
            let unlocked = m.unlocked;
            if (result.level === "Beginner") {
              unlocked = m.id === 1;
            } else if (result.level === "Intermediate") {
              unlocked = m.id <= 2;
            } else if (result.level === "Advanced") {
              unlocked = m.id <= 4;
            }
            return { ...m, unlocked: unlocked || m.completed };
          });

          extraState = {
            currentLevel: result.level,
            readinessScore: result.score,
            lastFuzzyResult: result,
            moduleProgress: newModules,
            students: state.students.map(s => {
              if (s.id === state.currentUser?.id) {
                return {
                  ...s,
                  level: result.level,
                  fuzzyScore: result.score,
                  moduleProgress: newModules,
                  lastFuzzyResult: result
                };
              }
              return s;
            }),
          };
        }

        return {
          fuzzyWeights: updatedWeights,
          ...extraState
        };
      }),

      fetchFuzzyWeights: async () => {
        const { token } = get();
        try {
          const data = await api.get<FuzzyWeights>("/api/fuzzy-weights", token);
          set({
            fuzzyWeights: {
              rule1Weight: data.rule1Weight,
              rule2Weight: data.rule2Weight,
              rule3Weight: data.rule3Weight,
              beginnerThreshold: data.beginnerThreshold,
              intermediateThreshold: data.intermediateThreshold,
            },
          });
        } catch { /* keep current local weights if this fails */ }
      },

      saveFuzzyWeights: async () => {
        const { token, fuzzyWeights } = get();
        try {
          await api.put<FuzzyWeights>("/api/fuzzy-weights", fuzzyWeights, token);
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Saqlashda xatolik" };
        }
      },

      fetchStudents: async () => {
        const { token } = get();
        try {
          const data = await api.get<BackendStudent[]>("/api/students", token);
          set({ students: data.map(backendStudentToStudent) });
        } catch { /* keep existing local list if this fails */ }
      },

      setStudentCredentials: async (studentId, password, username) => {
        const { token } = get();
        try {
          const res = await api.put<{ username: string; hasPassword: boolean }>(
            `/api/students/${studentId}/credentials`,
            { password, ...(username ? { username } : {}) },
            token,
          );
          set((state) => ({
            students: state.students.map(s =>
              s.id === studentId ? { ...s, username: res.username, hasPassword: true } : s
            ),
          }));
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Saqlashda xatolik" };
        }
      },

      deleteStudent: async (studentId) => {
        const { token } = get();
        try {
          await api.del(`/api/students/${studentId}`, token);
          set((state) => ({ students: state.students.filter(s => s.id !== studentId) }));
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "O'chirishda xatolik" };
        }
      },

      fetchAssignments: async () => {
        const { token } = get();
        try {
          const data = await api.get<BackendAssignment[]>("/api/assignments", token);
          set({ assignments: data.map(backendAssignmentToAssignment) });
        } catch { /* keep existing local list if this fails */ }
      },

      addAssignment: async (title, studentId, targetModuleId, questions = [], description = "", assignmentType = "Nazariy") => {
        const { token } = get();
        const payload = {
          title,
          description,
          targetModuleId,
          assignmentType,
          questions: questions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
          })),
        };
        try {
          // studentId === 0 → assign to every student at once.
          if (studentId === 0) {
            await api.post("/api/assignments", { ...payload, allStudents: true }, token);
            await get().fetchAssignments();
            return { success: true };
          }

          const created = await api.post<BackendAssignment>("/api/assignments", {
            ...payload,
            studentId,
          }, token);

          set((state) => ({
            assignments: [backendAssignmentToAssignment(created), ...state.assignments],
          }));
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Topshiriq yaratishda xatolik" };
        }
      },

      completeAssignment: async (assignmentId, answers) => {
        const { token } = get();
        try {
          const result = await api.post<AssignmentResult>(
            `/api/assignments/${assignmentId}/complete`, answers ? { answers } : {}, token,
          );
          if (result.completed) {
            set((state) => ({
              assignments: state.assignments.map(a =>
                a.id === assignmentId ? { ...a, completed: true } : a
              ),
            }));
          }
          if (result.moduleCompleted) {
            // Modul tugadi, keyingisi ochildi — progress'ni serverdan qayta olamiz
            try {
              const moduleProgress = await api.get<BackendModuleProgress[]>("/api/students/me/progress", token);
              set({ moduleProgress });
            } catch { /* keyingi qayta yuklashda verifySession sinxronlaydi */ }
          }
          return { success: true, result };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Xatolik yuz berdi" };
        }
      },

      fetchLessons: async () => {
        const { token } = get();
        try {
          const data = await api.get<BackendLesson[]>("/api/lessons", token);
          set({ lessons: data.map(backendLessonToLesson) });
        } catch { /* keep existing local list if this fails */ }
      },

      addLesson: async (lessonData) => {
        const { token } = get();
        try {
          const created = await api.post<BackendLesson>("/api/lessons", lessonData, token);
          set((state) => ({ lessons: [backendLessonToLesson(created), ...state.lessons] }));
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Dars yaratishda xatolik" };
        }
      },

      deleteLesson: async (lessonId) => {
        const { token } = get();
        try {
          await api.del(`/api/lessons/${lessonId}`, token);
          set((state) => ({ lessons: state.lessons.filter(l => l.id !== lessonId) }));
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Darsni o'chirishda xatolik" };
        }
      },

      markLessonRead: async (lessonId) => {
        const { token, currentUser } = get();
        const userId = currentUser?.id;
        if (!userId) return { success: false, message: "Tizimga kirilmagan" };
        try {
          await api.post(`/api/lessons/${lessonId}/read`, {}, token);
          set((state) => ({
            lessons: state.lessons.map(l =>
              l.id === lessonId && !l.readByStudents.includes(userId)
                ? { ...l, readByStudents: [...l.readByStudents, userId] }
                : l
            ),
          }));
          return { success: true };
        } catch (err) {
          return { success: false, message: err instanceof Error ? err.message : "Xatolik yuz berdi" };
        }
      },

      resetProgress: () => set(initialState),
    }),
    {
      name: 'cyber-learning-store-v5',
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_EXPIRED_EVENT, (e) => {
    if (useAppStore.getState().currentUser) {
      useAppStore.getState().logoutUser();
      // Server sababni yozadi: "Parol o'zgartirilgan. Iltimos, qayta kiring." va h.k.
      const reason = (e as CustomEvent<string | undefined>).detail;
      notify.warning('Sessiya tugadi', reason || 'Iltimos, tizimga qaytadan kiring.');
    }
  });
}
