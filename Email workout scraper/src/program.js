const STORAGE_KEYS = {
  program: "jump-program-v1",
  profile: "jump-profile-v1"
};

export class AthleteProfile {
  constructor({ height, weight, age, sex, jumperType, constraints, trainingDaysPerWeek, blockedExercises, maxLifts }) {
    this.height = height;
    this.weight = weight;
    this.age = age;
    this.sex = sex;
    this.jumperType = jumperType;
    this.constraints = constraints;
    this.trainingDaysPerWeek = Number(trainingDaysPerWeek);
    this.blockedExercises = blockedExercises ?? "";
    this.maxLifts = maxLifts;
  }

  static default() {
    return new AthleteProfile({
      height: "6ft1",
      weight: "92kg",
      age: 26,
      sex: "male",
      jumperType: "2-foot",
      constraints: "Recurring right patellar tendon irritation; hip tightness.",
      trainingDaysPerWeek: 3,
      blockedExercises: "",
      maxLifts: {
        squat: 0,
        deadlift: 0,
        trapBarDeadlift: 0,
        powerClean: 0,
        hipThrust: 0
      }
    });
  }

  static fromJSON(json) {
    return new AthleteProfile({
      ...AthleteProfile.default().toJSON(),
      ...json,
      maxLifts: {
        ...AthleteProfile.default().maxLifts,
        ...(json?.maxLifts ?? {})
      }
    });
  }

  toJSON() {
    return {
      height: this.height,
      weight: this.weight,
      age: this.age,
      sex: this.sex,
      jumperType: this.jumperType,
      constraints: this.constraints,
      trainingDaysPerWeek: this.trainingDaysPerWeek,
      blockedExercises: this.blockedExercises,
      maxLifts: this.maxLifts
    };
  }
}

export class Exercise {
  constructor({ id, name, category, sets, reps, intensity, intent, completedSets }) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.sets = Number(sets);
    this.reps = String(reps);
    this.intensity = intensity;
    this.intent = intent;
    this.completedSets = completedSets ?? Array.from({ length: this.sets }, () => false);
  }

  static fromJSON(json) {
    return new Exercise(json);
  }

  withSetCompletion(setIndex) {
    const completedSets = this.completedSets.map((done, index) => index === setIndex ? !done : done);
    return new Exercise({ ...this.toJSON(), completedSets });
  }

  withPatch(patch) {
    const nextSets = Number(patch.sets ?? this.sets);
    const completedSets = Array.from({ length: nextSets }, (_, index) => this.completedSets[index] ?? false);
    return new Exercise({ ...this.toJSON(), ...patch, sets: nextSets, completedSets });
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      sets: this.sets,
      reps: this.reps,
      intensity: this.intensity,
      intent: this.intent,
      completedSets: this.completedSets
    };
  }
}

export class WorkoutSession {
  constructor({
    id,
    date,
    title,
    macrocyclePhase,
    mesocycle,
    mesoLabel,
    week,
    weekLabel,
    trainingEmphasis,
    volumeClassification,
    intensity,
    fatigueScore,
    adaptationTarget,
    riskFlags,
    exercises
  }) {
    this.id = id;
    this.date = date;
    this.title = title;
    this.macrocyclePhase = macrocyclePhase;
    this.mesocycle = mesocycle;
    this.mesoLabel = mesoLabel;
    this.week = week;
    this.weekLabel = weekLabel;
    this.trainingEmphasis = trainingEmphasis;
    this.volumeClassification = volumeClassification;
    this.intensity = intensity;
    this.fatigueScore = fatigueScore;
    this.adaptationTarget = adaptationTarget;
    this.riskFlags = riskFlags;
    this.exercises = exercises.map((exercise) => Exercise.fromJSON(exercise));
  }

  static fromJSON(json) {
    return new WorkoutSession(json);
  }

  withExerciseUpdate(exerciseId, patch) {
    return new WorkoutSession({
      ...this.toJSON(),
      exercises: this.exercises.map((exercise) => exercise.id === exerciseId ? exercise.withPatch(patch) : exercise)
    });
  }

  withExerciseAdded() {
    const id = `ex-${Date.now()}`;
    const exercise = new Exercise({
      id,
      name: "New exercise",
      category: "accessory",
      sets: 3,
      reps: "8",
      intensity: "RPE 6",
      intent: "Add intent after reconstruction."
    });
    return new WorkoutSession({
      ...this.toJSON(),
      exercises: [...this.exercises, exercise]
    });
  }

  withExerciseDeleted(exerciseId) {
    return new WorkoutSession({
      ...this.toJSON(),
      exercises: this.exercises.filter((exercise) => exercise.id !== exerciseId)
    });
  }

  withDate(date) {
    return new WorkoutSession({ ...this.toJSON(), date });
  }

  withSetCompletion(exerciseId, setIndex) {
    return new WorkoutSession({
      ...this.toJSON(),
      exercises: this.exercises.map((exercise) => exercise.id === exerciseId ? exercise.withSetCompletion(setIndex) : exercise)
    });
  }

  toJSON() {
    return {
      id: this.id,
      date: this.date,
      title: this.title,
      macrocyclePhase: this.macrocyclePhase,
      mesocycle: this.mesocycle,
      mesoLabel: this.mesoLabel,
      week: this.week,
      weekLabel: this.weekLabel,
      trainingEmphasis: this.trainingEmphasis,
      volumeClassification: this.volumeClassification,
      intensity: this.intensity,
      fatigueScore: this.fatigueScore,
      adaptationTarget: this.adaptationTarget,
      riskFlags: this.riskFlags,
      exercises: this.exercises.map((exercise) => exercise.toJSON())
    };
  }
}

export class TrainingProgram {
  constructor({ sourceLabel, sessions, mesocycles }) {
    this.sourceLabel = sourceLabel;
    this.sessions = sessions.map((session) => WorkoutSession.fromJSON(session));
    this.mesocycles = mesocycles;
  }

  static fromJSON(json) {
    return new TrainingProgram(json);
  }

  sessionForDate(date) {
    return this.sessions.find((session) => session.date === date) ?? null;
  }

  upcomingFrom(date, limit) {
    return this.sessions
      .filter((session) => session.date >= date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, limit);
  }

  byMesocycle() {
    if (this.mesocycles.length === 0) {
      return [{
        index: 0,
        label: "Imported TeamBuildr",
        purpose: "Email-derived workouts awaiting macrocycle classification.",
        loading: "as written",
        sessions: this.sessions
      }];
    }
    return this.mesocycles.map((meso) => ({
      ...meso,
      sessions: this.sessions.filter((session) => session.mesocycle === meso.index)
    }));
  }

  calendarWindow(anchorDate, dayCount) {
    const anchor = new Date(`${anchorDate}T12:00:00`);
    return Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(anchor);
      date.setDate(anchor.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      const session = this.sessionForDate(key);
      return {
        date: key,
        dayNumber: date.getDate(),
        weekday: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
        hasWorkout: Boolean(session),
        title: session?.title ?? "Recovery",
        phaseShort: session ? session.mesocycle > 0 ? `M${session.mesocycle}` : "TB" : "Rest"
      };
    });
  }

  withSetCompletion(sessionId, exerciseId, setIndex) {
    return new TrainingProgram({
      ...this.toJSON(),
      sessions: this.sessions.map((session) => session.id === sessionId ? session.withSetCompletion(exerciseId, setIndex) : session)
    });
  }

  withExerciseUpdate(sessionId, exerciseId, patch) {
    return new TrainingProgram({
      ...this.toJSON(),
      sessions: this.sessions.map((session) => session.id === sessionId ? session.withExerciseUpdate(exerciseId, patch) : session)
    });
  }

  withExerciseAdded(sessionId) {
    return new TrainingProgram({
      ...this.toJSON(),
      sessions: this.sessions.map((session) => session.id === sessionId ? session.withExerciseAdded() : session)
    });
  }

  withExerciseDeleted(sessionId, exerciseId) {
    return new TrainingProgram({
      ...this.toJSON(),
      sessions: this.sessions.map((session) => session.id === sessionId ? session.withExerciseDeleted(exerciseId) : session)
    });
  }

  withSessionDeleted(sessionId) {
    return new TrainingProgram({
      ...this.toJSON(),
      sessions: this.sessions.filter((session) => session.id !== sessionId)
    });
  }

  toJSON() {
    return {
      sourceLabel: this.sourceLabel,
      sessions: this.sessions.map((session) => session.toJSON()),
      mesocycles: this.mesocycles
    };
  }
}

export class ProgramRepository {
  constructor(storage) {
    this.storage = storage;
  }

  loadProgram() {
    return this.read(STORAGE_KEYS.program);
  }

  saveProgram(program) {
    this.write(STORAGE_KEYS.program, program.toJSON());
  }

  loadProfile() {
    return this.read(STORAGE_KEYS.profile);
  }

  saveProfile(profile) {
    this.write(STORAGE_KEYS.profile, profile.toJSON());
  }

  read(key) {
    const raw = this.storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }

  write(key, value) {
    this.storage.setItem(key, JSON.stringify(value));
  }

  clearProgram() {
    this.storage.removeItem(STORAGE_KEYS.program);
  }
}

export class ProgramService {
  constructor(repository) {
    this.repository = repository;
  }

  todayKey() {
    const now = new Date();
    const local = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    return local.toISOString().slice(0, 10);
  }

  loadProgram() {
    const saved = this.repository.loadProgram();
    return saved ? TrainingProgram.fromJSON(saved) : this.resetSeedProgram();
  }

  programFromJSON(json) {
    return TrainingProgram.fromJSON(json);
  }

  saveProgram(program) {
    this.repository.saveProgram(program);
  }

  loadProfile() {
    const saved = this.repository.loadProfile();
    return saved ? AthleteProfile.fromJSON(saved) : AthleteProfile.default();
  }

  saveProfile(profile) {
    this.repository.saveProfile(profile);
  }

  personalizeProgram(sourceProgram, profile) {
    return ProgramPersonalizer.create(sourceProgram, profile, this.todayKey());
  }

  resetSeedProgram() {
    const program = SeedProgramFactory.create(this.todayKey());
    this.repository.saveProgram(program);
    return program;
  }
}

export class ProgramPersonalizer {
  static create(sourceProgram, profile, startDate) {
    const mesocycles = [
      { index: 1, label: "Meso 1 - General Prep", purpose: "Build work capacity, tendon tolerance, hypertrophy, movement quality, and positional strength.", loading: "65-70%" },
      { index: 2, label: "Meso 2 - Intensification", purpose: "Increase force output and transition toward specificity.", loading: "75-85%" },
      { index: 3, label: "Meso 3 - Max Strength", purpose: "Build maximal force and convert it into jump-specific output.", loading: "80-90%" },
      { index: 4, label: "Meso 4 - Specific Power", purpose: "Keep heavy strength while increasing jump-specific power.", loading: "80-90%" },
      { index: 5, label: "Meso 5 - Elastic Conversion", purpose: "Convert force into short-contact bounce and approach-jump transfer.", loading: "maintenance" },
      { index: 6, label: "Meso 6 - Peak", purpose: "Reduce volume and express jump height with freshness.", loading: "moderate-fast" }
    ];
    const library = this.exerciseLibrary(sourceProgram, profile);
    const sessions = [];
    const trainingDays = this.trainingDays(profile.trainingDaysPerWeek);
    const start = new Date(`${startDate}T12:00:00`);

    for (let weekIndex = 0; weekIndex < 24; weekIndex += 1) {
      const mesocycle = Math.floor(weekIndex / 4) + 1;
      const week = (weekIndex % 4) + 1;
      trainingDays.forEach((dayOffset, sessionIndex) => {
        const date = new Date(start);
        date.setDate(start.getDate() + weekIndex * 7 + dayOffset);
        sessions.push(this.session({
          date: date.toISOString().slice(0, 10),
          mesocycle,
          week,
          sessionIndex,
          meso: mesocycles[mesocycle - 1],
          library,
          profile
        }));
      });
    }

    return new TrainingProgram({
      sourceLabel: "Personalized 24-week plan from Gmail import",
      mesocycles,
      sessions
    });
  }

  static exerciseLibrary(sourceProgram, profile) {
    const blocked = this.blockedSet(profile.blockedExercises);
    const unique = new Map();
    for (const session of sourceProgram.sessions) {
      for (const exercise of session.exercises) {
        if (!exercise?.name || blocked.has(this.key(exercise.name))) continue;
        if (this.isFooterNoise(exercise.name)) continue;
        const key = this.key(`${exercise.category}:${exercise.name}`);
        if (!unique.has(key)) unique.set(key, exercise);
      }
    }
    return [...unique.values()];
  }

  static session({ date, mesocycle, week, sessionIndex, meso, library, profile }) {
    const isDeload = week === 4;
    const titles = ["Force and prep", "Power and stiffness", "Tendon and transfer"];
    const exercises = this.template(mesocycle, sessionIndex)
      .flatMap((slot) => this.pick(library, slot, profile, isDeload))
      .map((exercise, index) => this.prescribe(exercise, { mesocycle, week, isDeload, index }));
    return new WorkoutSession({
      id: `personal-m${mesocycle}-w${week}-d${sessionIndex + 1}`,
      date,
      title: `${titles[sessionIndex] ?? "Training"}${isDeload ? " deload" : ""}`,
      macrocyclePhase: meso.label,
      mesocycle,
      mesoLabel: meso.label,
      week,
      weekLabel: `Week ${week} - ${["Intro load", "Progression", "Peak loading", "Deload"][week - 1]}`,
      trainingEmphasis: this.trainingEmphasis(mesocycle, sessionIndex),
      volumeClassification: isDeload ? "low" : week === 3 ? "moderate-high" : "moderate",
      intensity: this.intensity(mesocycle, isDeload),
      fatigueScore: isDeload ? 2 : Math.min(5, 2 + week + (sessionIndex === 1 ? 1 : 0)),
      adaptationTarget: this.adaptationTarget(mesocycle, sessionIndex, isDeload),
      riskFlags: this.riskFlags(exercises, profile),
      exercises
    });
  }

  static template(mesocycle, sessionIndex) {
    const base = [
      ["joint prep", 1],
      ["warmup", 3],
      ["mobility", 3],
      ["sprint drill", mesocycle >= 5 ? 4 : 3]
    ];
    const sessionSlots = [
      [["Olympic lift", 1], ["primary strength", 1], ["general strength", 2], ["accessory", 1]],
      [["sprint drill", 2], ["Olympic lift", 1], ["medicine ball", 2], ["primary strength", 1], ["accessory", 1]],
      [["joint prep", 1], ["mobility", 2], ["general strength", 3], ["accessory", 2]]
    ];
    if (mesocycle >= 5) {
      return [...base, ["sprint drill", 2], ["Olympic lift", 1], ["primary strength", 1], ["accessory", 1]];
    }
    return [...base, ...(sessionSlots[sessionIndex] ?? sessionSlots[0])];
  }

  static pick(library, [category, count], profile, isDeload) {
    const candidates = library
      .filter((exercise) => exercise.category === category)
      .filter((exercise) => !this.isHighRiskForProfile(exercise, profile, isDeload));
    return this.rotate(candidates.length ? candidates : library.filter((exercise) => exercise.category === category), count);
  }

  static rotate(items, count) {
    return items.slice(0, count);
  }

  static prescribe(exercise, { mesocycle, isDeload, index }) {
    const sets = this.setsFor(exercise, mesocycle, isDeload);
    return new Exercise({
      ...exercise.toJSON(),
      id: `p-${mesocycle}-${index}-${slug(exercise.name)}`,
      sets,
      reps: this.repsFor(exercise, mesocycle, isDeload),
      intensity: this.intensityFor(exercise, mesocycle, isDeload),
      completedSets: Array.from({ length: sets }, () => false)
    });
  }

  static setsFor(exercise, mesocycle, isDeload) {
    if (isDeload) return Math.min(2, Math.max(1, exercise.sets));
    if (["warmup", "mobility", "joint prep"].includes(exercise.category)) return 1;
    if (mesocycle === 1) return Math.min(4, Math.max(2, exercise.sets || 3));
    if (mesocycle === 2) return 4;
    if (mesocycle <= 4) return 3;
    return 2;
  }

  static repsFor(exercise, mesocycle, isDeload) {
    if (isDeload) return exercise.category === "primary strength" ? "3 easy" : exercise.reps;
    if (["warmup", "mobility", "joint prep", "sprint drill"].includes(exercise.category)) return exercise.reps;
    if (mesocycle === 1) return exercise.reps === "listed" ? "8-12" : exercise.reps;
    if (mesocycle === 2) return "3-5";
    if (mesocycle <= 4) return "2-5";
    return "2-4 fast";
  }

  static intensityFor(exercise, mesocycle, isDeload) {
    if (isDeload) return "easy, leave fresh";
    if (exercise.intensity && exercise.intensity !== "as written") return exercise.intensity;
    if (exercise.category === "primary strength") {
      if (mesocycle === 1) return "65-70% or RPE 6-7";
      if (mesocycle === 2) return "75-85% or RPE 7-8";
      if (mesocycle <= 4) return "80-90%, no grind";
      return "maintenance, fast bar";
    }
    if (exercise.category === "Olympic lift") return mesocycle >= 5 ? "light-fast" : "technical-fast";
    return "quality reps";
  }

  static trainingEmphasis(mesocycle, sessionIndex) {
    const map = {
      1: ["capacity", "general power", "tendon tolerance"],
      2: ["force output", "Olympic power", "technical stiffness"],
      3: ["max strength", "strength-speed", "jump transfer"],
      4: ["specific power", "reactive strength", "approach quality"],
      5: ["elastic conversion", "max jump expression", "bounce"],
      6: ["freshness", "peak jumping", "readiness"]
    };
    return map[mesocycle][sessionIndex] ?? map[mesocycle][0];
  }

  static intensity(mesocycle, isDeload) {
    if (isDeload) return "deload";
    if (mesocycle === 1) return "65-70%";
    if (mesocycle === 2) return "75-85%";
    if (mesocycle <= 4) return "80-90%";
    return "fast maintenance";
  }

  static adaptationTarget(mesocycle, sessionIndex, isDeload) {
    if (isDeload) return "Unload fatigue and preserve movement quality.";
    if (mesocycle === 1) return "Build tissue capacity and a bilateral force base without provoking the right knee.";
    if (mesocycle === 2) return "Increase force output while keeping sprint and jump contacts technical.";
    if (mesocycle <= 4) return "Raise force ceiling and convert it into jump-specific power.";
    if (mesocycle === 5) return "Convert strength into short-contact elastic output.";
    return "Express jump height with low fatigue and high freshness.";
  }

  static riskFlags(exercises, profile) {
    const flags = [];
    const names = exercises.map((exercise) => exercise.name.toLowerCase()).join(" ");
    if (/lunge|squat|bound|jump|cut|step/.test(names)) flags.push("Monitor right patellar tendon response");
    if (/sprint|skip|snatch|clean|high knee|hip/.test(names)) flags.push("Warm hips thoroughly before speed or catch positions");
    if (/right patellar|jumper/i.test(profile.constraints)) flags.push("No painful reps; substitute if knee pain climbs during session");
    return [...new Set(flags)];
  }

  static isHighRiskForProfile(exercise, profile, isDeload) {
    const name = exercise.name.toLowerCase();
    if (!/right patellar|jumper/i.test(profile.constraints)) return false;
    if (isDeload && /bound|jump|cut|lunge/.test(name)) return true;
    return /depth jump|max jump|dunk/.test(name);
  }

  static blockedSet(value) {
    return new Set(String(value || "").split(/,|\n/).map((item) => this.key(item)).filter(Boolean));
  }

  static key(value) {
    return String(value).trim().toLowerCase();
  }

  static isFooterNoise(name) {
    return /print or complete|shop now|teambuildr blog|twitter|facebook|instagram|google plus|unsubscribe/i.test(name);
  }

  static trainingDays(daysPerWeek) {
    if (daysPerWeek <= 2) return [0, 3];
    if (daysPerWeek >= 4) return [0, 1, 3, 5];
    return [0, 2, 4];
  }
}

export class SeedProgramFactory {
  static create(startDate) {
    const mesocycles = [
      { index: 1, label: "Meso 1 - General Prep", purpose: "Build work capacity, tendon tolerance, hypertrophy, movement quality, and positional strength.", loading: "65-70%" },
      { index: 2, label: "Meso 2 - Intensification", purpose: "Increase force output and transition toward specificity.", loading: "75-85%" },
      { index: 3, label: "Meso 3 - Max Strength", purpose: "Build maximal force and start converting it into jump-specific output.", loading: "80-90%" },
      { index: 4, label: "Meso 4 - Specific Power", purpose: "Convert strength into higher-output jump patterns.", loading: "80-90%" },
      { index: 5, label: "Meso 5 - Elastic Conversion", purpose: "Convert force into bounce with reactive contacts and max jumps.", loading: "Maintenance only" },
      { index: 6, label: "Meso 6 - Peak", purpose: "Maximize freshness and jump expression.", loading: "Moderate-fast" }
    ];
    const sessions = [];
    const start = new Date(`${startDate}T12:00:00`);
    const trainingDays = [0, 2, 4];

    for (let weekIndex = 0; weekIndex < 24; weekIndex += 1) {
      const mesocycle = Math.floor(weekIndex / 4) + 1;
      const week = (weekIndex % 4) + 1;
      trainingDays.forEach((dayOffset, sessionIndex) => {
        const date = new Date(start);
        date.setDate(start.getDate() + weekIndex * 7 + dayOffset);
        sessions.push(this.sessionFor({
          date: date.toISOString().slice(0, 10),
          mesocycle,
          week,
          sessionIndex,
          meso: mesocycles[mesocycle - 1]
        }));
      });
    }

    return new TrainingProgram({
      sourceLabel: "Provisional scaffold until emails are imported",
      mesocycles,
      sessions
    });
  }

  static sessionFor({ date, mesocycle, week, sessionIndex, meso }) {
    const dayNames = ["Force base", "Power transfer", "Tendon capacity"];
    const weekLabels = ["Intro load", "Progression", "Peak loading", "Deload"];
    const isDeload = week === 4;
    const fatigueScore = isDeload ? 2 : Math.min(5, week + sessionIndex);
    const riskFlags = sessionIndex === 2 ? ["Monitor patellar tendon response", "Keep contacts crisp"] : [];
    const title = `${dayNames[sessionIndex]} ${isDeload ? "deload" : "session"}`;

    return new WorkoutSession({
      id: `m${mesocycle}-w${week}-d${sessionIndex + 1}`,
      date,
      title,
      macrocyclePhase: meso.label,
      mesocycle,
      mesoLabel: meso.label,
      week,
      weekLabel: `Week ${week} - ${weekLabels[week - 1]}`,
      trainingEmphasis: this.emphasis(mesocycle, sessionIndex),
      volumeClassification: isDeload ? "low" : week === 3 ? "high" : "moderate",
      intensity: this.intensity(mesocycle, isDeload),
      fatigueScore,
      adaptationTarget: this.adaptationTarget(mesocycle, sessionIndex, isDeload),
      riskFlags,
      exercises: this.exercises(mesocycle, sessionIndex, isDeload)
    });
  }

  static emphasis(mesocycle, sessionIndex) {
    const base = {
      1: ["tissue prep and hypertrophy", "general power", "unilateral control"],
      2: ["force output", "Olympic pull mechanics", "technical jumping"],
      3: ["max force", "strength-speed", "approach jump exposure"],
      4: ["specific power", "reactive strength", "approach jump quality"],
      5: ["elastic contacts", "max jump expression", "sprint and dunk transfer"],
      6: ["freshness", "technical refinement", "readiness maintenance"]
    };
    return base[mesocycle][sessionIndex];
  }

  static intensity(mesocycle, isDeload) {
    if (isDeload) return "50-60%, low contacts";
    if (mesocycle === 1) return "65-70%";
    if (mesocycle === 2) return "75-85%";
    if (mesocycle <= 4) return "80-90%";
    if (mesocycle === 5) return "fast maintenance loads";
    return "moderate-fast";
  }

  static adaptationTarget(mesocycle, sessionIndex, isDeload) {
    if (isDeload) return "Unload fatigue and realize adaptation from the prior three weeks.";
    const targets = {
      1: ["Build tissue capacity and bilateral force base.", "Improve rate of force development without high specificity.", "Build unilateral control and tendon tolerance."],
      2: ["Shift from volume to heavier force production.", "Develop Olympic pull power and bar speed.", "Keep jump contacts technical while force work rises."],
      3: ["Raise ceiling for force production.", "Blend heavy strength with faster outputs.", "Introduce more specific approach jump transfer."],
      4: ["Turn maximal strength into jump-specific power.", "Increase reactive output under managed volume.", "Practice approach quality while fatigue is controlled."],
      5: ["Convert strength into short-contact elasticity.", "Express max jump and dunk attempts without grinders.", "Preserve strength while prioritizing bounce."],
      6: ["Keep the nervous system sharp.", "Express peak jump height.", "Stay fresh and technically clean."]
    };
    return targets[mesocycle][sessionIndex];
  }

  static exercises(mesocycle, sessionIndex, isDeload) {
    const scale = isDeload ? { sets: 2, reps: "3-5", intensity: "easy-fast" } : null;
    const templates = {
      1: [
        [
          ["Locomotion prep", "warmup", 2, "20m", "easy", "Tissue prep and coordination."],
          ["Pogo jumps", "plyometric", 5, "4", "crisp", "Low amplitude stiffness."],
          ["Sumo deadlift", "primary strength", 4, "8", "65-70%", "Bilateral posterior-chain force for a 2-foot jumper."],
          ["Rear-foot elevated split squat", "secondary strength", 3, "10/side", "RPE 7", "Unilateral positional strength."],
          ["Seated calf raise pause", "accessory", 4, "12", "2s pause", "Soleus stiffness and Achilles resilience."]
        ],
        [
          ["Dynamic flexibility", "mobility", 2, "8", "controlled", "Open hips and prepare deep ROM."],
          ["Power clean from hang", "Olympic lift", 5, "4", "technical", "Rate of force development."],
          ["Deep squat", "primary strength", 4, "10", "65-70%", "Force production through range."],
          ["Hip thrust", "secondary strength", 3, "10", "RPE 7", "Horizontal hip extension force."],
          ["Tibialis raise", "accessory", 3, "14", "smooth", "Lower-leg balance."]
        ],
        [
          ["Sprint mechanics A-skip", "sprint drill", 3, "20m", "snappy", "Frontside mechanics."],
          ["Low box jump", "plyometric", 5, "4", "stick landing", "Jump coordination."],
          ["Trap bar deadlift", "primary strength", 4, "8", "65-70%", "Bilateral force without excessive knee travel."],
          ["Step-down", "secondary strength", 3, "8/side", "slow", "Patellar tendon control."],
          ["Copenhagen plank", "accessory", 3, "20s/side", "controlled", "Adductor and hip integrity."]
        ]
      ],
      2: [
        [
          ["Dynamic warmup", "warmup", 2, "20m", "easy", "Readiness."],
          ["Broad jump", "plyometric", 4, "3", "max intent", "Horizontal power."],
          ["Power clean", "Olympic lift", 6, "3", "75-85%", "Force output with speed."],
          ["Back squat", "primary strength", 5, "5", "75-85%", "Heavy bilateral strength."],
          ["Seated calf raise pause", "accessory", 4, "10", "2s pause", "Tendon capacity."]
        ],
        [
          ["Sprint buildups", "sprint drill", 4, "20m", "fast relaxed", "Stiffness and rhythm."],
          ["Clean pull", "Olympic lift", 5, "3", "~90% power clean", "Heavy pull power."],
          ["Front squat", "primary strength", 5, "4", "75-85%", "Upright force production."],
          ["Hip thrust", "secondary strength", 4, "6", "heavy-fast", "Hip extension power."],
          ["Spanish squat iso", "accessory", 4, "30s", "analgesic", "Patellar tendon tolerance."]
        ],
        [
          ["Approach rhythm jumps", "plyometric", 5, "2", "technical", "Moderate jump exposure."],
          ["Snatch pull", "Olympic lift", 5, "3", "fast", "Vertical pull speed."],
          ["Split squat", "primary strength", 4, "5/side", "RPE 8", "Single-leg force support."],
          ["Nordic eccentric", "accessory", 3, "5", "slow", "Hamstring resilience."],
          ["Hip flexor lift-off", "mobility", 3, "8/side", "controlled", "Hip tightness support."]
        ]
      ]
    };

    const later = [
      [
        ["Sprint buildups", "sprint drill", 4, "20m", "fast", "Prime elastic stiffness."],
        ["Depth jump", "plyometric", 4, "3", "short contact", "Reactive transfer."],
        ["Trap bar jump", "power movement", 4, "3", "light-fast", "Specific power."],
        ["Back squat", "primary strength", mesocycle >= 5 ? 3 : 5, mesocycle >= 5 ? "3" : "3-5", mesocycle >= 5 ? "maintenance" : "80-90%", "Maintain or build force ceiling."],
        ["Seated calf raise pause", "accessory", 3, "8", "controlled", "Tendon stiffness."]
      ],
      [
        ["Approach jumps", "plyometric", mesocycle >= 5 ? 6 : 4, "1-2", "max quality", "Jump expression."],
        ["Clean pull", "Olympic lift", 4, "2-3", "fast", "High rate of force."],
        ["Split squat", "primary strength", mesocycle >= 5 ? 2 : 4, "3/side", "fast", "Specific unilateral support."],
        ["Hip thrust", "secondary strength", 3, "4", "fast", "Hip extension carryover."],
        ["Hip mobility flow", "mobility", 2, "6/side", "easy", "Manage hip tightness."]
      ],
      [
        ["Sprint mechanics", "sprint drill", 3, "20m", "sharp", "Frontside rhythm."],
        ["Repeated pogo", "plyometric", mesocycle >= 5 ? 5 : 4, "8s", "short contact", "Elastic contact quality."],
        ["Dunk attempts", "plyometric", mesocycle >= 5 ? 8 : 4, "1", "full rest", "Transfer to sport outcome."],
        ["Trap bar deadlift", "primary strength", mesocycle >= 5 ? 2 : 4, "2-4", "fast only", "Readiness maintenance."],
        ["Spanish squat iso", "accessory", 3, "30s", "controlled", "Patellar tendon tolerance."]
      ]
    ];

    const selected = (templates[mesocycle] ?? later)[sessionIndex];
    return selected.map(([name, category, sets, reps, intensity, intent], index) => {
      const finalSets = scale?.sets ?? sets;
      return new Exercise({
        id: `${slug(name)}-${index}`,
        name,
        category,
        sets: finalSets,
        reps: scale?.reps ?? reps,
        intensity: scale?.intensity ?? intensity,
        intent
      });
    });
  }
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
