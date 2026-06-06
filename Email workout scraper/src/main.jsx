import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Mail,
  Sparkles,
  Dumbbell,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Trash2
} from "lucide-react";
import "./styles.css";
import {
  AthleteProfile,
  Exercise,
  PROGRAM_PHILOSOPHY,
  ProgramRepository,
  ProgramService,
  SeedProgramFactory,
  WorkoutSession,
  displayWeightFromKg,
  exerciseWeightKey,
  formatLoadRecommendation,
  tendonPainDecision
} from "./program.js";
import { supabase, isSupabaseConfigured, authRedirectUrl } from "./supabaseClient.js";
import { SupabaseProgramRepository } from "./syncRepository.js";

const legacyRepository = new ProgramRepository(window.localStorage);
const service = new ProgramService(legacyRepository);
const localImportDecisionKey = (userId) => `jump-user-${userId}:local-import-decision-v1`;

function App() {
  const [repository, setRepository] = useState(() => legacyRepository);
  const [session, setSession] = useState(null);
  const [isBooting, setIsBooting] = useState(isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? "Checking account" : "Local only");
  const [program, setProgram] = useState(() => service.loadProgram());
  const [profile, setProfile] = useState(() => service.loadProfile());
  const [selectedDate, setSelectedDate] = useState(() => service.todayKey());
  const [activeView, setActiveView] = useState("today");
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [importNotice, setImportNotice] = useState("");
  const [readiness, setReadiness] = useState(() => service.loadReadiness());
  const [showProfileUpdatePrompt, setShowProfileUpdatePrompt] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => service.todayKey().slice(0, 7));
  const [skipTarget, setSkipTarget] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [showLocalImportPrompt, setShowLocalImportPrompt] = useState(false);
  const [showPasswordResetPrompt, setShowPasswordResetPrompt] = useState(false);

  const selectedWorkout = useMemo(
    () => program.sessionForDate(selectedDate),
    [program, selectedDate]
  );
  const upcoming = useMemo(() => program.upcomingFrom(service.todayKey(), 12), [program]);
  const calendarDays = useMemo(() => program.calendarWindow(selectedDate, 21), [program, selectedDate]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let isMounted = true;
    const isRecoveryRedirect = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
    if (isRecoveryRedirect) setShowPasswordResetPrompt(true);

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;
      if (event === "PASSWORD_RECOVERY") setShowPasswordResetPrompt(true);
      applySession(nextSession);
    });

    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      await applySession(data.session);
      setIsBooting(false);
    }

    boot();
    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function applySession(nextSession) {
    setSession(nextSession);
    if (!nextSession?.user) {
      setRepository(legacyRepository);
      setProfile(service.loadProfile());
      setProgram(service.loadProgram());
      setReadiness(service.loadReadiness());
      setSyncStatus(isSupabaseConfigured ? "Signed out" : "Local only");
      return;
    }

    const userRepository = new ProgramRepository(window.localStorage, `jump-user-${nextSession.user.id}`);
    const cloudRepository = new SupabaseProgramRepository({
      supabase,
      userId: nextSession.user.id,
      localRepository: userRepository
    });
    setRepository(cloudRepository);
    setSyncStatus("Loading account");
    try {
      const hasRemoteData = await cloudRepository.hasRemoteData();
      const hasImportDecision = Boolean(window.localStorage.getItem(localImportDecisionKey(nextSession.user.id)));
      setShowLocalImportPrompt(!hasRemoteData && !hasImportDecision && legacyRepository.hasLocalData());
      const [savedProfile, savedProgram, savedReadiness] = await Promise.all([
        cloudRepository.loadProfile(),
        cloudRepository.loadProgram(),
        cloudRepository.loadReadiness()
      ]);
      const nextProfile = savedProfile ? AthleteProfile.fromJSON(savedProfile) : AthleteProfile.default();
      const nextProgram = savedProgram
        ? service.programFromJSON(savedProgram)
        : SeedProgramFactory.create(service.todayKey());
      if (!savedProgram) await cloudRepository.saveProgram(nextProgram);
      if (!savedProfile) await cloudRepository.saveProfile(nextProfile);
      setProfile(nextProfile);
      setProgram(nextProgram);
      setReadiness(savedReadiness ?? {});
      setSelectedDate(firstCurrentOrFutureDate(nextProgram, service.todayKey()));
      setSyncStatus("Synced");
    } catch (error) {
      const cachedProfile = userRepository.loadProfile();
      const cachedProgram = userRepository.loadProgram();
      setProfile(cachedProfile ? AthleteProfile.fromJSON(cachedProfile) : service.loadProfile());
      setProgram(cachedProgram ? service.programFromJSON(cachedProgram) : service.loadProgram());
      setReadiness(userRepository.loadReadiness());
      setSyncStatus(`Offline cache: ${error.message}`);
    }
  }

  function saveWithStatus(action) {
    setSyncStatus(repository === legacyRepository ? "Local only" : "Saving");
    Promise.resolve(action())
      .then(() => setSyncStatus(repository === legacyRepository ? "Local only" : "Synced"))
      .catch((error) => setSyncStatus(`Unsynced changes: ${error.message}`));
  }

  function persist(nextProgram) {
    setProgram(nextProgram);
    saveWithStatus(() => repository.saveProgram(nextProgram));
  }

  function persistProfile(nextProfile) {
    setProfile(nextProfile);
    saveWithStatus(() => repository.saveProfile(nextProfile));
  }

  function updateExerciseWeight(exerciseName, value) {
    persistProfile(profile.withExerciseWeight(exerciseName, value, profile.weightUnit));
  }

  function toggleSet(sessionId, exerciseId, setIndex) {
    persist(program.withSetCompletion(sessionId, exerciseId, setIndex));
  }

  function updateExercise(sessionId, exerciseId, patch) {
    persist(program.withExerciseUpdate(sessionId, exerciseId, patch));
  }

  function addExercise(sessionId) {
    persist(program.withExerciseAdded(sessionId));
  }

  function deleteExercise(sessionId, exerciseId) {
    persist(program.withExerciseDeleted(sessionId, exerciseId));
  }

  function skipSession(sessionId, note) {
    const next = program.withSessionSkipped(sessionId, note);
    persist(next);
    setImportNotice("Session marked as skipped for this date only.");
    setSkipTarget(null);
  }

  function updateReadiness(sessionId, patch) {
    setReadiness((current) => {
      const sessionForReadiness = program.sessions.find((sessionItem) => sessionItem.id === sessionId);
      const next = {
        ...current,
        [sessionId]: {
          date: sessionForReadiness?.date ?? selectedDate,
        kneePain: 1,
        achillesPain: 1,
        isoReducedPain: true,
        pfpSymptoms: false,
        ...(current[sessionId] ?? {}),
        ...patch
      }
      };
      saveWithStatus(() => repository.saveReadiness(next));
      return next;
    });
  }

  function personalizeProgram() {
    const next = service.personalizeProgram(program, profile);
    persist(next);
    setSelectedDate(firstCurrentOrFutureDate(next, service.todayKey()));
    setActiveView("today");
    setImportNotice(`Created ${next.sessions.length} personalized sport-aware workouts.`);
  }

  function saveProfileAndPrompt(nextProfile) {
    persistProfile(nextProfile);
    setShowProfileUpdatePrompt(true);
  }

  function updateProgramFromSavedProfile() {
    const next = service.personalizeProgram(program, profile);
    persist(next);
    setSelectedDate(firstCurrentOrFutureDate(next, service.todayKey()));
    setActiveView("today");
    setImportNotice(`Updated current program with ${next.sessions.length} sport-aware workouts.`);
    setShowProfileUpdatePrompt(false);
  }

  function requestProgramUpdate() {
    setConfirmation({
      eyebrow: "Overwrite warning",
      title: "Update current program?",
      body: "This will regenerate your current program around the saved profile, sport schedule, and training rules. Existing workout edits and set completions may be overwritten.",
      confirmLabel: "Update program",
      icon: <Sparkles size={18} />,
      onConfirm: () => {
        personalizeProgram();
        setConfirmation(null);
      }
    });
  }

  function requestProgramReset() {
    setConfirmation({
      eyebrow: "Overwrite warning",
      title: "Reset program?",
      body: "This will overwrite your existing personalized program and replace it with the built-in scaffold. Your saved profile and sport schedule stay saved.",
      confirmLabel: "Reset program",
      icon: <RotateCcw size={18} />,
      danger: true,
      onConfirm: () => {
        resetSeed();
        setConfirmation(null);
      }
    });
  }

  function resetSeed() {
    const next = SeedProgramFactory.create(service.todayKey());
    persist(next);
    setSelectedDate(service.todayKey());
    setImportNotice("Reset to provisional scaffold program.");
  }

  async function loadImportedWorkouts() {
    setImportNotice("Looking for local Gmail import...");
    try {
      const response = await fetch(`/imported-workouts.json?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("No import file found. Run npm run gmail:import first.");
      const imported = await response.json();
      const next = service.programFromJSON(imported);
      persist(next);
      const firstDate = next.sessions[0]?.date ?? service.todayKey();
      setSelectedDate(firstDate);
      setActiveView("today");
      setImportNotice(`Loaded ${next.sessions.length} imported workouts.`);
    } catch (error) {
      setImportNotice(error.message);
    }
  }

  async function importLocalDataToAccount() {
    if (!session?.user || !repository.importLocalData) return;
    const localProfile = legacyRepository.loadProfile();
    const localProgram = legacyRepository.loadProgram();
    const localReadiness = legacyRepository.loadReadiness();
    const nextProfile = localProfile ? AthleteProfile.fromJSON(localProfile) : profile;
    const nextProgram = localProgram ? service.programFromJSON(localProgram) : program;
    setSyncStatus("Importing local data");
    try {
      await repository.importLocalData({
        profile: nextProfile,
        program: nextProgram,
        readiness: localReadiness
      });
      window.localStorage.setItem(localImportDecisionKey(session.user.id), "imported");
      setProfile(nextProfile);
      setProgram(nextProgram);
      setReadiness(localReadiness ?? {});
      setShowLocalImportPrompt(false);
      setImportNotice("Imported this browser's local training data into your account.");
      setSyncStatus("Synced");
    } catch (error) {
      setSyncStatus(`Import failed: ${error.message}`);
    }
  }

  function skipLocalImport() {
    if (session?.user) {
      window.localStorage.setItem(localImportDecisionKey(session.user.id), "start-fresh");
    }
    setShowLocalImportPrompt(false);
    setImportNotice("Local import dismissed. Your account will use the synced training plan from now on.");
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  if (isBooting) {
    return <LoadingShell message="Loading your training account..." />;
  }

  if (isSupabaseConfigured && !session) {
    return <AuthView />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">24-week macrocycle</p>
          <h1>Jump Program</h1>
        </div>
      </header>

      {importNotice && <div className="notice">{importNotice}</div>}

      <nav className="segmented" aria-label="App views">
        {[
          ["today", "Today"],
          ["calendar", "Calendar"],
          ["program", "Program"],
          ["profile", "Profile"],
          ["settings", "Settings"]
        ].map(([key, label]) => (
          <button key={key} className={activeView === key ? "active" : ""} onClick={() => setActiveView(key)}>
            {label}
          </button>
        ))}
      </nav>

      {activeView === "today" && (
        <WorkoutView
          workout={selectedWorkout}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          calendarDays={calendarDays}
          onToggleSet={toggleSet}
          onUpdateExercise={updateExercise}
          onAddExercise={addExercise}
          onDeleteExercise={deleteExercise}
          onOpenSkipSession={setSkipTarget}
          editingExerciseId={editingExerciseId}
          setEditingExerciseId={setEditingExerciseId}
          readiness={selectedWorkout ? readiness[selectedWorkout.id] : null}
          onReadinessChange={updateReadiness}
          profile={profile}
          onExerciseWeightChange={updateExerciseWeight}
        />
      )}

      {activeView === "calendar" && (
        <CalendarView
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          program={program}
          onOpenToday={() => setActiveView("today")}
        />
      )}

      {activeView === "program" && <ProgramView program={program} setSelectedDate={setSelectedDate} setActiveView={setActiveView} />}

      {activeView === "profile" && (
        <ProfileView
          profile={profile}
          program={program}
          syncStatus={syncStatus}
          onEdit={() => setActiveView("settings")}
        />
      )}

      {activeView === "settings" && (
        <SettingsView
          profile={profile}
          session={session}
          syncStatus={syncStatus}
          onSave={saveProfileAndPrompt}
          onLoadImportedWorkouts={loadImportedWorkouts}
          onUpdateProgram={requestProgramUpdate}
          onResetProgram={requestProgramReset}
          onSignOut={signOut}
        />
      )}
      {showLocalImportPrompt && (
        <LocalImportModal
          onImport={importLocalDataToAccount}
          onSkip={skipLocalImport}
        />
      )}
      {showProfileUpdatePrompt && (
        <UpdateProgramModal
          onUpdate={updateProgramFromSavedProfile}
          onClose={() => setShowProfileUpdatePrompt(false)}
        />
      )}
      {skipTarget && (
        <SkipSessionModal
          workout={skipTarget}
          onSkip={(note) => skipSession(skipTarget.id, note)}
          onClose={() => setSkipTarget(null)}
        />
      )}
      {confirmation && (
        <ConfirmationModal
          confirmation={confirmation}
          onClose={() => setConfirmation(null)}
        />
      )}
      {showPasswordResetPrompt && (
        <PasswordResetModal onClose={() => setShowPasswordResetPrompt(false)} />
      )}
    </main>
  );
}

function Metric({ label, value, icon }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function programProgressMetrics(program) {
  const sessions = program?.sessions ?? [];
  const trainingSessions = sessions.filter((session) => session.exercises?.length > 0);
  const setTotals = trainingSessions.reduce((totals, session) => {
    session.exercises.forEach((exercise) => {
      totals.completed += exercise.completedSets.filter(Boolean).length;
      totals.planned += exercise.completedSets.length;
    });
    return totals;
  }, { completed: 0, planned: 0 });
  const completedSessions = trainingSessions.filter((session) => (
    session.exercises.every((exercise) => exercise.completedSets.length > 0 && exercise.completedSets.every(Boolean))
  ));
  const partialSessions = trainingSessions.filter((session) => (
    session.exercises.some((exercise) => exercise.completedSets.some(Boolean))
    && !completedSessions.includes(session)
  ));
  const skippedSessions = trainingSessions.filter((session) => session.skipped);
  const completionRate = setTotals.planned > 0 ? Math.round((setTotals.completed / setTotals.planned) * 100) : 0;
  const lastCompleted = completedSessions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    completedSessions: completedSessions.length,
    partialSessions: partialSessions.length,
    skippedSessions: skippedSessions.length,
    totalSessions: trainingSessions.length,
    completedSets: setTotals.completed,
    plannedSets: setTotals.planned,
    completionRate,
    lastCompletedDate: lastCompleted?.date ?? null
  };
}

function LoadingShell({ message }) {
  return (
    <main className="app-shell">
      <section className="auth-panel">
        <p className="eyebrow">Jump Program</p>
        <h1>{message}</h1>
      </section>
    </main>
  );
}

function AuthView() {
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handlePasswordAuth(event) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    setIsSending(true);
    setMessage("");
    const authCall = mode === "signup"
      ? supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: authRedirectUrl
        }
      })
      : supabase.auth.signInWithPassword({ email, password });
    const { data, error } = await authCall;
    setIsSending(false);
    if (error) {
      if (mode === "password" && error.message.toLowerCase().includes("email not confirmed")) {
        await recoverUnconfirmedAccount();
        return;
      }
      setMessage(error.message);
      return;
    }
    if (mode === "signup") {
      setMessage(data?.session
        ? "Account created and signed in."
        : "Confirmation email sent. Check inbox and spam, then sign in. If you already have an account, use Sign in.");
      return;
    }
    setMessage("Signed in.");
  }

  async function recoverUnconfirmedAccount() {
    setIsSending(true);
    setMessage("Finishing account setup...");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirectUrl
      }
    });
    setIsSending(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(data?.session
      ? "Account setup finished. Signed in."
      : "This account still needs verification. Create a new account or reset the password.");
  }

  async function resendConfirmation() {
    if (!email) {
      setMessage("Enter your email first.");
      return;
    }
    setIsSending(true);
    setMessage("");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: authRedirectUrl
      }
    });
    setIsSending(false);
    setMessage(error ? error.message : "Confirmation email resent. Check inbox and spam.");
  }

  async function sendMagicLink(event) {
    event.preventDefault();
    setIsSending(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authRedirectUrl
      }
    });
    setIsSending(false);
    setMessage(error ? error.message : "Check your email for the login link.");
  }

  async function sendPasswordReset() {
    if (!email) {
      setMessage("Enter your email first.");
      return;
    }
    setIsSending(true);
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl
    });
    setIsSending(false);
    setMessage(error ? error.message : "Password reset email sent.");
  }

  return (
    <main className="app-shell auth-shell">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">Account sync</p>
          <h1>Jump Program</h1>
          <p>Use password login for daily phone access. Magic link remains available as a fallback.</p>
        </div>
        <div className="auth-tabs" role="tablist" aria-label="Auth mode">
          <button type="button" className={mode === "password" ? "active" : ""} onClick={() => setMode("password")}>Sign in</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
          <button type="button" className={mode === "magic" ? "active" : ""} onClick={() => setMode("magic")}>Magic link</button>
        </div>
        <form className="auth-form" onSubmit={mode === "magic" ? sendMagicLink : handlePasswordAuth}>
          <label>Email
            <input
              type="email"
              value={email}
              placeholder="you@example.com"
              required
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {mode !== "magic" && (
            <label>Password
              <input
                type="password"
                value={password}
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}
          <button type="submit" className="primary-action" disabled={isSending}>
            <Mail size={18} />
            {isSending ? "Working..." : authButtonLabel(mode)}
          </button>
        </form>
        {mode === "password" && (
          <button type="button" className="text-button auth-reset" disabled={isSending} onClick={sendPasswordReset}>
            Forgot password?
          </button>
        )}
        {mode === "signup" && (
          <button type="button" className="text-button auth-reset" disabled={isSending} onClick={resendConfirmation}>
            Resend confirmation email
          </button>
        )}
        {message && <div className="notice">{message}</div>}
      </section>
    </main>
  );
}

function authButtonLabel(mode) {
  if (mode === "signup") return "Create account";
  if (mode === "magic") return "Send magic link";
  return "Sign in";
}

function PasswordResetModal({ onClose }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function updatePassword(event) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) {
      setMessage("Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Passwords do not match.");
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Password updated. You can keep training.");
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="password-reset-title">
        <div>
          <p className="eyebrow">Password reset</p>
          <h2 id="password-reset-title">Set a new password</h2>
          <p>Use this after opening the Supabase reset link. The password is handled by Supabase Auth and is not stored in this app.</p>
        </div>
        <form className="auth-form" onSubmit={updatePassword}>
          <label>New password
            <input
              type="password"
              value={password}
              minLength={8}
              autoComplete="new-password"
              required
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>Confirm password
            <input
              type="password"
              value={confirmation}
              minLength={8}
              autoComplete="new-password"
              required
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </label>
          {message && <div className="notice">{message}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-action" onClick={onClose}>Close</button>
            <button type="submit" className="primary-action" disabled={isSaving}>
              <Save size={18} />
              {isSaving ? "Saving..." : "Save password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function LocalImportModal({ onImport, onSkip }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="local-import-title">
        <div>
          <p className="eyebrow">Legacy migration</p>
          <h2 id="local-import-title">Use old local browser data?</h2>
          <p>This is only for migrating pre-account data. Start fresh keeps the new account program built from the current training philosophy.</p>
        </div>
        <div className="modal-actions">
          <button className="secondary-action" onClick={onSkip}>Start fresh</button>
          <button className="primary-action" onClick={onImport}>
            <Save size={18} />
            Import old local data
          </button>
        </div>
      </section>
    </div>
  );
}

function UpdateProgramModal({ onUpdate, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="update-program-title">
        <div>
          <p className="eyebrow">Profile saved</p>
          <h2 id="update-program-title">Update current program now?</h2>
          <p>Your profile changes are saved. Updating will regenerate the current plan around the new profile and sport schedule.</p>
        </div>
        <div className="modal-actions">
          <button className="secondary-action" onClick={onClose}>Not now</button>
          <button className="primary-action" onClick={onUpdate}>
            <Sparkles size={18} />
            Update program
          </button>
        </div>
      </section>
    </div>
  );
}

function SkipSessionModal({ workout, onSkip, onClose }) {
  const [note, setNote] = useState("");
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="skip-session-title">
        <div>
          <p className="eyebrow">This date only</p>
          <h2 id="skip-session-title">Skip {workout.title}?</h2>
          <p>Keep the session in history, mark it skipped, and add a note about what happened.</p>
        </div>
        <label className="wide">Skip note
          <textarea
            value={note}
            placeholder="Public holiday, no basketball."
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button className="secondary-action" onClick={onClose}>Cancel</button>
          <button className="primary-action" onClick={() => onSkip(note)}>
            <Trash2 size={18} />
            Mark skipped
          </button>
        </div>
      </section>
    </div>
  );
}

function ConfirmationModal({ confirmation, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
        <div>
          <p className="eyebrow">{confirmation.eyebrow}</p>
          <h2 id="confirmation-title">{confirmation.title}</h2>
          <p>{confirmation.body}</p>
        </div>
        <div className="modal-actions">
          <button className="secondary-action" onClick={onClose}>Cancel</button>
          <button className={confirmation.danger ? "primary-action danger-action" : "primary-action"} onClick={confirmation.onConfirm}>
            {confirmation.icon}
            {confirmation.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function WorkoutView({
  workout,
  selectedDate,
  setSelectedDate,
  calendarDays,
  onToggleSet,
  onUpdateExercise,
  onAddExercise,
  onDeleteExercise,
  onOpenSkipSession,
  editingExerciseId,
  setEditingExerciseId,
  readiness,
  onReadinessChange,
  profile,
  onExerciseWeightChange
}) {
  const [showWarnings, setShowWarnings] = useState(false);
  const [showStructure, setShowStructure] = useState(false);

  useEffect(() => {
    setShowWarnings(false);
    setShowStructure(false);
  }, [workout?.id]);

  return (
    <section className="layout-two">
      <aside className="sidebar-panel">
        <div className="date-switcher">
          <button className="icon-button" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} aria-label="Previous day">
            <ChevronLeft size={18} />
          </button>
          <div>
            <span>Selected</span>
            <strong>{formatDate(selectedDate)}</strong>
          </div>
          <button className="icon-button" onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} aria-label="Next day">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="day-strip">
          {calendarDays.map((day) => (
            <button
              key={day.date}
              className={day.date === selectedDate ? "calendar-day selected" : "calendar-day"}
              onClick={() => setSelectedDate(day.date)}
            >
              <span>{day.weekday}</span>
              <strong>{day.monthDay}</strong>
              <small>{day.hasWorkout ? day.title : "Recovery"}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="workout-panel">
        {workout ? (
          <>
            <div className="workout-header">
              <div>
                <p className="eyebrow">{workout.mesoLabel} / {workout.weekLabel}</p>
                <h2>{workout.title}</h2>
                <p>{workout.adaptationTarget}</p>
              </div>
              <div className={`fatigue fatigue-${workout.fatigueScore}`}>
                <span>Planned load</span>
                <strong>{workout.fatigueScore}/5</strong>
              </div>
            </div>
            <div className="workout-actions">
              {workout.riskFlags.length > 0 && (
                <button className="secondary-action compact-warning-action" onClick={() => setShowWarnings((current) => !current)}>
                  <AlertTriangle size={16} />
                  {showWarnings ? "Hide warnings" : `Warnings (${workout.riskFlags.length})`}
                </button>
              )}
              <button className="secondary-action" onClick={() => onOpenSkipSession(workout)}>
                <Trash2 size={16} />
                Skip session
              </button>
            </div>
            {workout.skipped && (
              <div className="skipped-banner">
                <AlertTriangle size={18} />
                <span>Skipped this date{workout.skipNote ? `: ${workout.skipNote}` : "."}</span>
              </div>
            )}
            {showWarnings && workout.riskFlags.length > 0 && (
              <div className="risk-banner">
                <div className="risk-banner-head">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>Session warnings</strong>
                    <span>Check these before loading the session.</span>
                  </div>
                </div>
                <ul className="risk-list">
                  {workout.riskFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
            <ReadinessGate
              workout={workout}
              readiness={readiness}
              onChange={(patch) => onReadinessChange(workout.id, patch)}
            />
            {workout.buckets?.length > 0 && (
              <section className="structure-panel">
                <button className="structure-toggle" onClick={() => setShowStructure((current) => !current)}>
                  <span>Training logic ({workout.buckets.length})</span>
                  <strong>{showStructure ? "Hide" : "Show"}</strong>
                </button>
                {showStructure && (
                  <div className="bucket-strip">
                    {workout.buckets.map((bucket) => (
                      <div className="bucket-chip" key={bucket.id}>
                        <span>{bucket.label}</span>
                        <small>{bucket.purpose}</small>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            <div className="exercise-list">
              {workout.exercises.map((exercise) => (
                <ExerciseRow
                  key={exercise.id}
                  workout={workout}
                  exercise={exercise}
                  isEditing={editingExerciseId === exercise.id}
                  onEdit={() => setEditingExerciseId(exercise.id)}
                  onClose={() => setEditingExerciseId(null)}
                  onToggleSet={onToggleSet}
                  onUpdateExercise={onUpdateExercise}
                  onDeleteExercise={onDeleteExercise}
                  profile={profile}
                  onExerciseWeightChange={onExerciseWeightChange}
                />
              ))}
            </div>
            <button className="secondary-action full-width" onClick={() => onAddExercise(workout.id)}>
              <Plus size={18} />
              Add exercise
            </button>
          </>
        ) : (
          <div className="empty-state">
            <CalendarDays size={36} />
            <h2>No workout scheduled</h2>
            <p>Use the calendar or program view to open another day. Rest days stay visible so load management does not disappear.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function ReadinessGate({ workout, readiness, onChange }) {
  const [showInputs, setShowInputs] = useState(false);
  const draft = {
    kneePain: 1,
    achillesPain: 1,
    isoReducedPain: true,
    pfpSymptoms: false,
    ...(readiness ?? {})
  };
  const isJumpDay = workout.readinessRules?.sessionType === "jump";
  const tendonPain = Math.max(Number(draft.kneePain), Number(draft.achillesPain));
  const decision = tendonPainDecision({
    tendonPain,
    isoReducedPain: draft.isoReducedPain && !draft.pfpSymptoms,
    sessionType: workout.readinessRules?.sessionType
  });

  useEffect(() => {
    setShowInputs(false);
  }, [workout.id]);

  return (
    <section className={`readiness-gate readiness-${decision.level}`}>
      <div className="readiness-head">
        <div>
          <p className="eyebrow">Joint health gate</p>
          <h3>{decision.title}</h3>
          <p>{draft.pfpSymptoms ? "PFP symptoms: remove isometrics and do not work through pain." : decision.detail}</p>
        </div>
        <div className="readiness-result">
          <span>Readiness result</span>
          <strong>{isJumpDay ? "Applies to jumping" : "Applies to loading"}</strong>
        </div>
      </div>
      <button className="readiness-toggle" onClick={() => setShowInputs((current) => !current)}>
        <span>Joint health inputs</span>
        <strong>{showInputs ? "Hide" : "Show"}</strong>
      </button>
      {showInputs && (
        <>
          <div className="readiness-grid">
            <label>Knee pain
              <input type="number" min="1" max="10" value={draft.kneePain} onChange={(event) => onChange({ kneePain: Number(event.target.value) })} />
            </label>
            <label>Achilles pain
              <input type="number" min="1" max="10" value={draft.achillesPain} onChange={(event) => onChange({ achillesPain: Number(event.target.value) })} />
            </label>
            <label>Isos reduced pain to 1?
              <select value={draft.isoReducedPain ? "yes" : "no"} onChange={(event) => onChange({ isoReducedPain: event.target.value === "yes" })}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label>PFP symptoms?
              <select value={draft.pfpSymptoms ? "yes" : "no"} onChange={(event) => onChange({ pfpSymptoms: event.target.value === "yes" })}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
          </div>
          <div className="pain-guide">
            {PROGRAM_PHILOSOPHY.painGuide.map((item) => (
              <span key={item.pain}>{item.pain}{item.pain === 4 ? "+" : ""}: {item.label}</span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ExerciseRow({ workout, exercise, isEditing, onEdit, onClose, onToggleSet, onUpdateExercise, onDeleteExercise, profile, onExerciseWeightChange }) {
  const completed = exercise.completedSets.filter(Boolean).length;
  const savedWeight = profile.exerciseWeights?.[exerciseWeightKey(exercise.name)] ?? null;
  const loadRecommendation = formatLoadRecommendation(exercise, profile, {
    mesocycle: workout.mesocycle,
    isDeload: workout.week === 4
  });
  return (
    <article className="exercise-card">
      <div className="exercise-main">
        <div>
          <span className="category">{exercise.category}</span>
          <h3>{exercise.name}</h3>
          <p>{exercise.intent}</p>
        </div>
        <div className="prescription">
          <strong>{exercise.sets} x {exercise.reps}</strong>
          <span>{exercise.intensity}</span>
        </div>
      </div>

      {loadRecommendation && (
        <div className="load-recommendation">
          <span>Recommended load</span>
          <strong>{loadRecommendation}</strong>
          <LoadRecommendationBasis exercise={exercise} />
        </div>
      )}

      <div className="set-grid">
        {exercise.completedSets.map((done, index) => (
          <button
            key={`${exercise.id}-${index}`}
            className={done ? "set-chip done" : "set-chip"}
            onClick={() => onToggleSet(workout.id, exercise.id, index)}
          >
            {done ? <Check size={15} /> : index + 1}
          </button>
        ))}
      </div>
      {isLoadTrackedExercise(exercise) && (
        <ExerciseWeightTracker
          exercise={exercise}
          savedWeight={savedWeight}
          unit={profile.weightUnit}
          onSave={onExerciseWeightChange}
        />
      )}
      <div className="exercise-footer">
        <span>{completed}/{exercise.sets} sets complete</span>
        <div>
          <button className="text-button" onClick={onEdit}>Edit</button>
          <button className="icon-button danger" aria-label={`Delete ${exercise.name}`} onClick={() => onDeleteExercise(workout.id, exercise.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {isEditing && (
        <ExerciseEditor
          exercise={exercise}
          onSave={(patch) => {
            onUpdateExercise(workout.id, exercise.id, patch);
            onClose();
          }}
          onClose={onClose}
        />
      )}
    </article>
  );
}

function LoadRecommendationBasis({ exercise }) {
  if (exercise.loadRecommendationSource === "profile-max") {
    return <small>Algorithm: profile max + exercise pattern + mesocycle.</small>;
  }
  if (exercise.loadRecommendationSource === "last-logged") {
    return <small>Algorithm: last logged working weight from profile.</small>;
  }
  if (exercise.loadPrescription?.raw) {
    return <small>Coach note: {exercise.loadPrescription.raw}</small>;
  }
  return null;
}

function isLoadTrackedExercise(exercise) {
  return /olympic|strength|accessory|power movement/i.test(exercise.category);
}

function ExerciseWeightTracker({ exercise, savedWeight, unit, onSave }) {
  const displayValue = savedWeight ? displayWeightFromKg(savedWeight.kg, unit) : "";
  const [draft, setDraft] = useState(displayValue);
  const inputId = `weight-${exercise.id}`;

  useEffect(() => {
    setDraft(displayValue);
  }, [displayValue]);

  function saveDraft() {
    onSave(exercise.name, draft);
  }

  return (
    <div className="weight-tracker">
      <label htmlFor={inputId}>Working weight</label>
      <div className="weight-input-row">
        <input
          id={inputId}
          type="number"
          min="0"
          step="0.5"
          value={draft}
          placeholder="Load"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={saveDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <span>{unit.toUpperCase()}</span>
        <button className="text-button" onClick={saveDraft}>Save</button>
      </div>
      {savedWeight && <small>Saved to profile</small>}
    </div>
  );
}

function ExerciseEditor({ exercise, onSave, onClose }) {
  const [draft, setDraft] = useState({
    name: exercise.name,
    category: exercise.category,
    sets: exercise.sets,
    reps: exercise.reps,
    intensity: exercise.intensity,
    intent: exercise.intent
  });

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="editor-grid">
      <label>Name<input value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
      <label>Category<input value={draft.category} onChange={(event) => update("category", event.target.value)} /></label>
      <label>Sets<input type="number" min="1" max="12" value={draft.sets} onChange={(event) => update("sets", Number(event.target.value))} /></label>
      <label>Reps<input value={draft.reps} onChange={(event) => update("reps", event.target.value)} /></label>
      <label>Intensity<input value={draft.intensity} onChange={(event) => update("intensity", event.target.value)} /></label>
      <label className="wide">Intent<input value={draft.intent} onChange={(event) => update("intent", event.target.value)} /></label>
      <div className="editor-actions">
        <button className="secondary-action" onClick={onClose}>Cancel</button>
        <button className="primary-action" onClick={() => onSave(draft)}>
          <Save size={16} />
          Save
        </button>
      </div>
    </div>
  );
}

function CalendarView({ selectedDate, setSelectedDate, calendarMonth, setCalendarMonth, program, onOpenToday }) {
  const monthDays = useMemo(() => calendarMonthGrid(calendarMonth, program), [calendarMonth, program]);
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(`${calendarMonth}-01T12:00:00`));
  return (
    <section className="calendar-layout">
      <div className="calendar-panel">
        <div className="calendar-toolbar">
          <button className="icon-button" aria-label="Previous month" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="eyebrow">Calendar</p>
            <h2>{monthLabel}</h2>
          </div>
          <button className="icon-button" aria-label="Next month" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="weekday-row">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="calendar-grid">
          {monthDays.map((day) => (
            day.inMonth ? (
              <button
                key={day.date}
                className={[
                  "month-day",
                  day.date === selectedDate ? "selected" : "",
                  day.skipped ? "skipped-day" : "",
                  day.hasWorkout ? "has-workout" : "rest-day"
                ].filter(Boolean).join(" ")}
                onClick={() => {
                  setSelectedDate(day.date);
                  onOpenToday();
                }}
              >
                <span>{day.monthDay}</span>
                <strong>{day.dayNumber}</strong>
                <small>{day.title}</small>
              </button>
            ) : (
              <div key={day.key} className="month-day placeholder" aria-hidden="true" />
            )
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgramView({ program, setSelectedDate, setActiveView }) {
  const grouped = program.byMesocycle();
  return (
    <section className="program-stack">
      {grouped.map((group) => (
        <article className="meso-band" key={group.label}>
          <div>
            <p className="eyebrow">{group.loading}</p>
            <h2>{group.label}</h2>
            <p>{group.purpose}</p>
          </div>
          <div className="session-row">
            {group.sessions.map((session) => (
              <button
                key={session.id}
                className="session-pill"
                onClick={() => {
                  setSelectedDate(session.date);
                  setActiveView("today");
                }}
              >
                <span>{formatDate(session.date)}</span>
                <strong>{session.title}</strong>
                <small>{session.volumeClassification}</small>
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function ProfileView({ profile, program, syncStatus, onEdit }) {
  const maxLiftEntries = Object.entries(profile.maxLifts ?? {});
  const progress = programProgressMetrics(program);
  return (
    <section className="profile-panel">
      <div className="profile-hero">
        <div>
          <p className="eyebrow">Athlete profile</p>
          <h2>{profile.jumperType} jumper</h2>
          <p>{profile.constraints}</p>
        </div>
        <button className="primary-action" onClick={onEdit}>
          <Settings size={18} />
          Edit profile
        </button>
      </div>
      <section className="status-grid profile-status-grid">
        <Metric label="Athlete" value={`${profile.height} / ${profile.weight}`} icon={<Activity size={18} />} />
        <Metric label="Age / sex" value={`${profile.age} / ${profile.sex}`} icon={<Shield size={18} />} />
        <Metric label="Days / week" value={profile.trainingDaysPerWeek} icon={<CalendarDays size={18} />} />
        <Metric label="Source" value={program.sourceLabel} icon={<Dumbbell size={18} />} />
        <Metric label="Sync" value={syncStatus} icon={<Shield size={18} />} />
      </section>
      <section className="status-grid profile-status-grid">
        <Metric label="Workouts completed" value={`${progress.completedSessions}/${progress.totalSessions}`} icon={<Check size={18} />} />
        <Metric label="Sets completed" value={`${progress.completedSets}/${progress.plannedSets}`} icon={<Dumbbell size={18} />} />
        <Metric label="Completion rate" value={`${progress.completionRate}%`} icon={<Activity size={18} />} />
        <Metric label="In progress" value={progress.partialSessions} icon={<CalendarDays size={18} />} />
        <Metric label="Skipped sessions" value={progress.skippedSessions} icon={<AlertTriangle size={18} />} />
        <Metric label="Last completed" value={progress.lastCompletedDate ? formatDate(progress.lastCompletedDate) : "None yet"} icon={<Check size={18} />} />
      </section>
      <div className="profile-detail-grid">
        <section>
          <p className="eyebrow">Sport schedule</p>
          <div className="profile-list">
            {profile.sportSchedule.map((sport) => (
              <div key={sport.id} className="profile-list-row">
                <strong>{sport.day}</strong>
                <span>{sport.sport} · {sport.intensity} intensity · {sport.jumpLoad} jump load</span>
              </div>
            ))}
          </div>
        </section>
        <section>
          <p className="eyebrow">Max lifts</p>
          <div className="profile-list">
            {maxLiftEntries.map(([key, value]) => (
              <div key={key} className="profile-list-row">
                <strong>{liftLabel(key)}</strong>
                <span>{Number(value) > 0 ? `${value}${profile.weightUnit.toUpperCase()}` : "Not set"}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="wide">
          <p className="eyebrow">Exercise exclusions</p>
          <p>{profile.blockedExercises || "No excluded exercises."}</p>
        </section>
      </div>
    </section>
  );
}

function SettingsView({ profile, session, syncStatus, onSave, onLoadImportedWorkouts, onUpdateProgram, onResetProgram, onSignOut }) {
  const [draft, setDraft] = useState(profile.toJSON());
  const liftKeys = Object.keys(draft.maxLifts);
  const sportSchedule = draft.sportSchedule ?? [];

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateLift(key, value) {
    setDraft((current) => ({ ...current, maxLifts: { ...current.maxLifts, [key]: value } }));
  }

  function updateSport(id, patch) {
    setDraft((current) => ({
      ...current,
      sportSchedule: (current.sportSchedule ?? []).map((sport) => sport.id === id ? { ...sport, ...patch } : sport)
    }));
  }

  function addSport() {
    setDraft((current) => ({
      ...current,
      sportSchedule: [
        ...(current.sportSchedule ?? []),
        {
          id: `sport-${Date.now()}`,
          sport: "Basketball",
          day: "Monday",
          intensity: "medium",
          jumpLoad: "medium"
        }
      ]
    }));
  }

  function removeSport(id) {
    setDraft((current) => ({
      ...current,
      sportSchedule: (current.sportSchedule ?? []).filter((sport) => sport.id !== id)
    }));
  }

  return (
    <section className="settings-panel">
      <div className="settings-copy">
        <p className="eyebrow">{session ? "Account sync" : "Local only"}</p>
        <h2>Athlete profile</h2>
        <p>{session ? `Signed in as ${session.user.email}. ${syncStatus}.` : "These values stay in this browser until Supabase is configured."}</p>
      </div>
      <div className="settings-grid">
        <label>Height<input value={draft.height} onChange={(event) => update("height", event.target.value)} /></label>
        <label>Weight<input value={draft.weight} onChange={(event) => update("weight", event.target.value)} /></label>
        <label>Age<input type="number" value={draft.age} onChange={(event) => update("age", Number(event.target.value))} /></label>
        <label>Days / week<input type="number" min="2" max="6" value={draft.trainingDaysPerWeek} onChange={(event) => update("trainingDaysPerWeek", Number(event.target.value))} /></label>
        <label>Weight unit<select value={draft.weightUnit} onChange={(event) => update("weightUnit", event.target.value)}>
          <option value="kg">KG</option>
          <option value="lb">LBS</option>
        </select></label>
        <label>Jumper type<select value={draft.jumperType} onChange={(event) => update("jumperType", event.target.value)}>
          <option>2-foot</option>
          <option>1-foot</option>
          <option>hybrid</option>
        </select></label>
        <label className="wide">Constraints<input value={draft.constraints} onChange={(event) => update("constraints", event.target.value)} /></label>
        <label className="wide">Exercises to exclude<input value={draft.blockedExercises} placeholder="Comma-separated, e.g. Overhead Squats, DB Twist Lunges" onChange={(event) => update("blockedExercises", event.target.value)} /></label>
        {liftKeys.map((key) => (
          <label key={key}>{liftLabel(key)}
            <input type="number" min="0" value={draft.maxLifts[key]} onChange={(event) => updateLift(key, Number(event.target.value))} />
          </label>
        ))}
      </div>
      <section className="sport-schedule">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Autoregulation</p>
            <h3>Sport schedule</h3>
          </div>
          <button className="secondary-action" onClick={addSport}>
            <Plus size={16} />
            Add sport
          </button>
        </div>
        <div className="sport-list">
          {sportSchedule.map((sport) => (
            <div className="sport-row" key={sport.id}>
              <label>Sport<input value={sport.sport} onChange={(event) => updateSport(sport.id, { sport: event.target.value })} /></label>
              <label>Day<select value={sport.day} onChange={(event) => updateSport(sport.id, { day: event.target.value })}>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => <option key={day}>{day}</option>)}
              </select></label>
              <label>Intensity<select value={sport.intensity} onChange={(event) => updateSport(sport.id, { intensity: event.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select></label>
              <label>Jump load<select value={sport.jumpLoad} onChange={(event) => updateSport(sport.id, { jumpLoad: event.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select></label>
              <button className="icon-button danger" aria-label={`Remove ${sport.sport} ${sport.day}`} onClick={() => removeSport(sport.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="dev-area">
        <div>
          <p className="eyebrow">Dev only</p>
          <h3>Coach library import</h3>
          <p>Legacy Gmail import tools live here so the normal app can run from your profile, sport schedule, readiness, and program rules.</p>
        </div>
        <button className="secondary-action" onClick={onLoadImportedWorkouts}>
          Load TeamBuildr import
        </button>
      </section>
      {session && (
        <section className="account-area">
          <div>
            <p className="eyebrow">Account</p>
            <h3>{session.user.email}</h3>
            <p>{syncStatus}</p>
          </div>
          <button className="secondary-action" onClick={onSignOut}>
            <LogOut size={16} />
            Sign out
          </button>
        </section>
      )}
      <div className="settings-actions">
        <button className="secondary-action" onClick={onUpdateProgram}>
          <Sparkles size={18} />
          Update program
        </button>
        <button className="secondary-action" onClick={onResetProgram}>
          <RotateCcw size={18} />
          Reset program
        </button>
        <button className="primary-action" onClick={() => onSave(AthleteProfile.fromJSON(draft))}>
          <Save size={18} />
          Save profile
        </button>
      </div>
    </section>
  );
}

function shiftDate(dateKey, delta) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

function shiftMonth(monthKey, delta) {
  const date = new Date(`${monthKey}-01T12:00:00`);
  date.setMonth(date.getMonth() + delta);
  return date.toISOString().slice(0, 7);
}

function calendarMonthGrid(monthKey, program) {
  const first = new Date(`${monthKey}-01T12:00:00`);
  const last = new Date(first);
  last.setMonth(first.getMonth() + 1);
  last.setDate(0);
  const leadingBlanks = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: leadingBlanks }, (_, index) => ({
    key: `blank-start-${index}`,
    inMonth: false
  }));
  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(first);
    date.setDate(day);
    const key = date.toISOString().slice(0, 10);
    const session = program.sessionForDate(key);
    cells.push({
      date: key,
      inMonth: true,
      dayNumber: day,
      monthDay: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date),
      hasWorkout: Boolean(session),
      skipped: Boolean(session?.skipped),
      title: session?.skipped ? `Skipped: ${session.title}` : session?.title ?? "Recovery"
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `blank-end-${cells.length}`, inMonth: false });
  }
  return cells;
}

function formatDate(dateKey) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${dateKey}T12:00:00`));
}

function firstCurrentOrFutureDate(program, todayKey) {
  return program.sessions.find((session) => session.date >= todayKey)?.date ?? program.sessions[0]?.date ?? todayKey;
}

function liftLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

createRoot(document.getElementById("root")).render(<App />);
