import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
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
  WorkoutSession,
  tendonPainDecision
} from "./program.js";

const repository = new ProgramRepository(window.localStorage);
const service = new ProgramService(repository);

function App() {
  const [program, setProgram] = useState(() => service.loadProgram());
  const [profile, setProfile] = useState(() => service.loadProfile());
  const [selectedDate, setSelectedDate] = useState(() => service.todayKey());
  const [activeView, setActiveView] = useState("today");
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [importNotice, setImportNotice] = useState("");
  const [readiness, setReadiness] = useState({});
  const [showProfileUpdatePrompt, setShowProfileUpdatePrompt] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => service.todayKey().slice(0, 7));

  const selectedWorkout = useMemo(
    () => program.sessionForDate(selectedDate),
    [program, selectedDate]
  );
  const upcoming = useMemo(() => program.upcomingFrom(service.todayKey(), 12), [program]);
  const calendarDays = useMemo(() => program.calendarWindow(selectedDate, 21), [program, selectedDate]);

  function persist(nextProgram) {
    service.saveProgram(nextProgram);
    setProgram(nextProgram);
  }

  function persistProfile(nextProfile) {
    service.saveProfile(nextProfile);
    setProfile(nextProfile);
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

  function deleteSession(sessionId) {
    const next = program.withSessionDeleted(sessionId);
    persist(next);
    const fallbackDate = next.sessions.find((session) => session.date >= selectedDate)?.date ?? next.sessions[0]?.date ?? service.todayKey();
    setSelectedDate(fallbackDate);
  }

  function updateReadiness(sessionId, patch) {
    setReadiness((current) => ({
      ...current,
      [sessionId]: {
        kneePain: 1,
        achillesPain: 1,
        isoReducedPain: true,
        pfpSymptoms: false,
        ...(current[sessionId] ?? {}),
        ...patch
      }
    }));
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

  function resetSeed() {
    const next = service.resetSeedProgram();
    setProgram(next);
    setSelectedDate(service.todayKey());
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">24-week macrocycle</p>
          <h1>Jump Program</h1>
        </div>
        <div className="top-actions">
          <button className="icon-button" aria-label="Reset provisional program" onClick={resetSeed}>
            <RotateCcw size={18} />
          </button>
          <button className="primary-action" onClick={personalizeProgram}>
            <Sparkles size={18} />
            Personalize
          </button>
          <button className="primary-action" onClick={() => setActiveView("settings")}>
            <Settings size={18} />
            Profile
          </button>
        </div>
      </header>

      <section className="status-grid">
        <Metric label="Athlete" value={`${profile.height} / ${profile.weight}`} icon={<Activity size={18} />} />
        <Metric label="Jumper type" value={profile.jumperType} icon={<Dumbbell size={18} />} />
        <Metric label="Risk notes" value="Right patellar tendon, hip tightness" icon={<Shield size={18} />} />
        <Metric label="Source" value={program.sourceLabel} icon={<CalendarDays size={18} />} />
      </section>
      {importNotice && <div className="notice">{importNotice}</div>}

      <nav className="segmented" aria-label="App views">
        {[
          ["today", "Today"],
          ["calendar", "Calendar"],
          ["program", "Program"],
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
          onDeleteSession={deleteSession}
          editingExerciseId={editingExerciseId}
          setEditingExerciseId={setEditingExerciseId}
          readiness={selectedWorkout ? readiness[selectedWorkout.id] : null}
          onReadinessChange={updateReadiness}
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

      {activeView === "settings" && (
        <SettingsView
          profile={profile}
          onSave={saveProfileAndPrompt}
          onLoadImportedWorkouts={loadImportedWorkouts}
        />
      )}
      {showProfileUpdatePrompt && (
        <UpdateProgramModal
          onUpdate={updateProgramFromSavedProfile}
          onClose={() => setShowProfileUpdatePrompt(false)}
        />
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

function WorkoutView({
  workout,
  selectedDate,
  setSelectedDate,
  calendarDays,
  onToggleSet,
  onUpdateExercise,
  onAddExercise,
  onDeleteExercise,
  onDeleteSession,
  editingExerciseId,
  setEditingExerciseId,
  readiness,
  onReadinessChange
}) {
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
                <span>Fatigue</span>
                <strong>{workout.fatigueScore}/5</strong>
              </div>
            </div>
            <div className="workout-actions">
              <button className="secondary-action" onClick={() => onDeleteSession(workout.id)}>
                <Trash2 size={16} />
                Remove workout
              </button>
            </div>
            {workout.riskFlags.length > 0 && (
              <div className="risk-banner">
                <AlertTriangle size={18} />
                <span>{workout.riskFlags.join(" · ")}</span>
              </div>
            )}
            <ReadinessGate
              workout={workout}
              readiness={readiness}
              onChange={(patch) => onReadinessChange(workout.id, patch)}
            />
            {workout.buckets?.length > 0 && (
              <div className="bucket-strip">
                {workout.buckets.map((bucket) => (
                  <div className="bucket-chip" key={bucket.id}>
                    <span>{bucket.label}</span>
                    <small>{bucket.purpose}</small>
                  </div>
                ))}
              </div>
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
            <p>Use the calendar or program view to open another day. Rest days stay visible so fatigue management does not disappear.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function ReadinessGate({ workout, readiness, onChange }) {
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

  return (
    <section className={`readiness-gate readiness-${decision.level}`}>
      <div className="readiness-head">
        <div>
          <p className="eyebrow">Joint health gate</p>
          <h3>{decision.title}</h3>
          <p>{draft.pfpSymptoms ? "PFP symptoms: remove isometrics and do not work through pain." : decision.detail}</p>
        </div>
        <strong>{isJumpDay ? "Jump decision" : "Load decision"}</strong>
      </div>
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
    </section>
  );
}

function ExerciseRow({ workout, exercise, isEditing, onEdit, onClose, onToggleSet, onUpdateExercise, onDeleteExercise }) {
  const completed = exercise.completedSets.filter(Boolean).length;
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

function SettingsView({ profile, onSave, onLoadImportedWorkouts }) {
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
        <p className="eyebrow">Local only</p>
        <h2>Athlete profile</h2>
        <p>These values stay in this browser until a database is added. Max lifts can later drive percentage-based prescriptions.</p>
      </div>
      <div className="settings-grid">
        <label>Height<input value={draft.height} onChange={(event) => update("height", event.target.value)} /></label>
        <label>Weight<input value={draft.weight} onChange={(event) => update("weight", event.target.value)} /></label>
        <label>Age<input type="number" value={draft.age} onChange={(event) => update("age", Number(event.target.value))} /></label>
        <label>Days / week<input type="number" min="2" max="6" value={draft.trainingDaysPerWeek} onChange={(event) => update("trainingDaysPerWeek", Number(event.target.value))} /></label>
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
      <button className="primary-action save-profile" onClick={() => onSave(AthleteProfile.fromJSON(draft))}>
        <Save size={18} />
        Save profile
      </button>
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
      title: session?.title ?? "Recovery"
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
