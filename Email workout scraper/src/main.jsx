import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
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
import { AthleteProfile, Exercise, ProgramRepository, ProgramService, WorkoutSession } from "./program.js";

const repository = new ProgramRepository(window.localStorage);
const service = new ProgramService(repository);

function App() {
  const [program, setProgram] = useState(() => service.loadProgram());
  const [profile, setProfile] = useState(() => service.loadProfile());
  const [selectedDate, setSelectedDate] = useState(() => service.todayKey());
  const [activeView, setActiveView] = useState("today");
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [importNotice, setImportNotice] = useState("");

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

  function personalizeProgram() {
    const next = service.personalizeProgram(program, profile);
    persist(next);
    setSelectedDate(next.sessions[0]?.date ?? service.todayKey());
    setActiveView("today");
    setImportNotice(`Created ${next.sessions.length} personalized workouts from your imported exercise library.`);
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
          <button className="secondary-action" onClick={loadImportedWorkouts}>
            <Download size={18} />
            Load import
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
        />
      )}

      {activeView === "calendar" && (
        <CalendarView
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          calendarDays={program.calendarWindow(service.todayKey(), 56)}
          upcoming={upcoming}
          onOpenToday={() => setActiveView("today")}
        />
      )}

      {activeView === "program" && <ProgramView program={program} setSelectedDate={setSelectedDate} setActiveView={setActiveView} />}

      {activeView === "settings" && <SettingsView profile={profile} onSave={persistProfile} />}
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
  setEditingExerciseId
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
              <strong>{day.dayNumber}</strong>
              <small>{day.hasWorkout ? day.phaseShort : "Rest"}</small>
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

function CalendarView({ selectedDate, setSelectedDate, calendarDays, upcoming, onOpenToday }) {
  return (
    <section className="layout-two">
      <div className="calendar-grid">
        {calendarDays.map((day) => (
          <button
            key={day.date}
            className={day.date === selectedDate ? "month-day selected" : "month-day"}
            onClick={() => {
              setSelectedDate(day.date);
              onOpenToday();
            }}
          >
            <span>{day.weekday}</span>
            <strong>{day.dayNumber}</strong>
            <small>{day.hasWorkout ? day.title : "Recovery"}</small>
          </button>
        ))}
      </div>
      <aside className="sidebar-panel">
        <h2>Upcoming</h2>
        <div className="upcoming-list">
          {upcoming.map((session) => (
            <button
              key={session.id}
              className="upcoming-item"
              onClick={() => {
                setSelectedDate(session.date);
                onOpenToday();
              }}
            >
              <span>{formatDate(session.date)}</span>
              <strong>{session.title}</strong>
              <small>{session.trainingEmphasis}</small>
            </button>
          ))}
        </div>
      </aside>
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

function SettingsView({ profile, onSave }) {
  const [draft, setDraft] = useState(profile.toJSON());
  const liftKeys = Object.keys(draft.maxLifts);

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateLift(key, value) {
    setDraft((current) => ({ ...current, maxLifts: { ...current.maxLifts, [key]: value } }));
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
        <label>Days / week<input type="number" min="2" max="4" value={draft.trainingDaysPerWeek} onChange={(event) => update("trainingDaysPerWeek", Number(event.target.value))} /></label>
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

function formatDate(dateKey) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(`${dateKey}T12:00:00`));
}

function liftLabel(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

createRoot(document.getElementById("root")).render(<App />);
