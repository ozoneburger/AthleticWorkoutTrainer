const STORAGE_KEYS = {
  program: "jump-program-v1",
  profile: "jump-profile-v1",
  readiness: "jump-readiness-v1"
};

export const PROGRAM_PHILOSOPHY = {
  progressionHierarchy: [
    "Pain reduction",
    "Jump quality",
    "Jump intensity",
    "Movement velocity",
    "Strength",
    "Volume"
  ],
  painGuide: [
    { pain: 1, label: "Increase intensity", action: "Progress the jump ramp if quality is high." },
    { pain: 2, label: "Hold intensity", action: "Stay at the same ramp level." },
    { pain: 3, label: "Decrease intensity", action: "Drop one ramp level and remain for 3-5 jumps." },
    { pain: 4, label: "Stop session", action: "End jumping for the day." }
  ],
  buckets: [
    { id: "joint-health", label: "Joint Health", purpose: "Rate knee and Achilles pain before loading decisions." },
    { id: "isometrics", label: "Isometrics", purpose: "Patellar or Achilles tendon pain modulation before performance work." },
    { id: "dynamic-flexibility", label: "Dynamic Flexibility", purpose: "Open ROM before sprinting and jumping." },
    { id: "sprint-development", label: "Sprint Development", purpose: "Prepare acceleration mechanics, elasticity, and rhythm." },
    { id: "jump-session", label: "Jump Session", purpose: "Ramp intensity by pain response and jump quality, not fixed volume." },
    { id: "strength-support", label: "Strength Support", purpose: "Support jumping with force, velocity, and tissue capacity work." },
    { id: "gpp-recovery", label: "GPP / Recovery", purpose: "Build movement quality, foot strength, hip strength, and recovery." }
  ]
};

export class AthleteProfile {
  constructor({ height, weight, age, sex, jumperType, constraints, trainingDaysPerWeek, blockedExercises, sportSchedule, weightUnit, exerciseWeights, maxLifts }) {
    this.height = height;
    this.weight = weight;
    this.age = age;
    this.sex = sex;
    this.jumperType = jumperType;
    this.constraints = constraints;
    this.trainingDaysPerWeek = Number(trainingDaysPerWeek);
    this.blockedExercises = blockedExercises ?? "";
    this.sportSchedule = normalizeSportSchedule(sportSchedule);
    this.weightUnit = normalizeWeightUnit(weightUnit);
    this.exerciseWeights = exerciseWeights ?? {};
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
      trainingDaysPerWeek: 6,
      blockedExercises: "",
      weightUnit: "kg",
      exerciseWeights: {},
      sportSchedule: [
        { id: "sport-basketball-monday", sport: "Basketball", day: "Monday", intensity: "medium", jumpLoad: "medium" },
        { id: "sport-volleyball-tuesday", sport: "Volleyball", day: "Tuesday", intensity: "high", jumpLoad: "high" },
        { id: "sport-volleyball-thursday", sport: "Volleyball", day: "Thursday", intensity: "high", jumpLoad: "high" }
      ],
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
      },
      sportSchedule: normalizeSportSchedule(json?.sportSchedule ?? AthleteProfile.default().sportSchedule)
    });
  }

  withExerciseWeight(exerciseName, displayValue, unit = this.weightUnit) {
    const value = Number(displayValue);
    const key = exerciseWeightKey(exerciseName);
    const nextWeights = { ...this.exerciseWeights };
    if (!Number.isFinite(value) || value <= 0) {
      delete nextWeights[key];
    } else {
      nextWeights[key] = {
        exerciseName,
        kg: unitToKg(value, unit),
        updatedAt: new Date().toISOString()
      };
    }
    return AthleteProfile.fromJSON({
      ...this.toJSON(),
      exerciseWeights: nextWeights
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
      sportSchedule: this.sportSchedule,
      weightUnit: this.weightUnit,
      exerciseWeights: this.exerciseWeights,
      maxLifts: this.maxLifts
    };
  }
}

export class Exercise {
  constructor({
    id,
    name,
    category,
    bucket,
    sets,
    reps,
    intensity,
    intent,
    completedSets,
    loadPrescription,
    recommendedWeightKg,
    recommendedWeightRangeKg,
    loadRecommendationLabel,
    loadRecommendationSource
  }) {
    this.id = id;
    this.name = name;
    this.category = category;
    this.bucket = bucket ?? bucketForCategory(category);
    this.sets = Number(sets);
    this.reps = String(reps);
    this.intensity = intensity;
    this.intent = intent;
    this.completedSets = completedSets ?? Array.from({ length: this.sets }, () => false);
    this.loadPrescription = loadPrescription ?? null;
    this.recommendedWeightKg = recommendedWeightKg ?? null;
    this.recommendedWeightRangeKg = recommendedWeightRangeKg ?? null;
    this.loadRecommendationLabel = loadRecommendationLabel ?? "";
    this.loadRecommendationSource = loadRecommendationSource ?? "";
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
      bucket: this.bucket,
      sets: this.sets,
      reps: this.reps,
      intensity: this.intensity,
      intent: this.intent,
      completedSets: this.completedSets,
      loadPrescription: this.loadPrescription,
      recommendedWeightKg: this.recommendedWeightKg,
      recommendedWeightRangeKg: this.recommendedWeightRangeKg,
      loadRecommendationLabel: this.loadRecommendationLabel,
      loadRecommendationSource: this.loadRecommendationSource
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
    buckets,
    readinessRules,
    skipped,
    skipNote,
    skippedAt,
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
    this.buckets = buckets ?? bucketsFromExercises(exercises);
    this.readinessRules = readinessRules ?? defaultReadinessRules();
    this.skipped = Boolean(skipped);
    this.skipNote = skipNote ?? "";
    this.skippedAt = skippedAt ?? null;
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

  withSkipped(note) {
    return new WorkoutSession({
      ...this.toJSON(),
      skipped: true,
      skipNote: String(note || "").trim(),
      skippedAt: new Date().toISOString()
    });
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
      buckets: this.buckets,
      readinessRules: this.readinessRules,
      skipped: this.skipped,
      skipNote: this.skipNote,
      skippedAt: this.skippedAt,
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
      .filter((session) => session.date >= date && !session.skipped)
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
        monthDay: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date),
        weekday: new Intl.DateTimeFormat("en", { weekday: "short" }).format(date),
        hasWorkout: Boolean(session),
        skipped: Boolean(session?.skipped),
        title: session?.skipped ? `Skipped: ${session.title}` : session?.title ?? "Recovery",
        phaseShort: session?.skipped ? "Skip" : session ? session.mesocycle > 0 ? `M${session.mesocycle}` : "TB" : "Rest"
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

  withSessionSkipped(sessionId, note) {
    return new TrainingProgram({
      ...this.toJSON(),
      sessions: this.sessions.map((session) => session.id === sessionId ? session.withSkipped(note) : session)
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
  constructor(storage, namespace = "") {
    this.storage = storage;
    this.namespace = namespace;
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

  loadReadiness() {
    return this.read(STORAGE_KEYS.readiness) ?? {};
  }

  saveReadiness(readiness) {
    this.write(STORAGE_KEYS.readiness, readiness ?? {});
  }

  hasLocalData() {
    return Boolean(this.loadProfile() || this.read(STORAGE_KEYS.program) || Object.keys(this.loadReadiness()).length > 0);
  }

  read(key) {
    const raw = this.storage.getItem(this.key(key));
    return raw ? JSON.parse(raw) : null;
  }

  write(key, value) {
    this.storage.setItem(this.key(key), JSON.stringify(value));
  }

  clearProgram() {
    this.storage.removeItem(this.key(STORAGE_KEYS.program));
  }

  key(key) {
    return this.namespace ? `${this.namespace}:${key}` : key;
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

  loadReadiness() {
    return this.repository.loadReadiness?.() ?? {};
  }

  saveReadiness(readiness) {
    this.repository.saveReadiness?.(readiness);
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
      { index: 1, label: "Meso 1 - Tissue Capacity", purpose: "Reduce pain sensitivity, improve movement quality, and build a force base.", loading: "low-moderate" },
      { index: 2, label: "Meso 2 - Force Production", purpose: "Increase force output while jumps stay pain-guided.", loading: "moderate-heavy" },
      { index: 3, label: "Meso 3 - Force Velocity", purpose: "Move from heavy pulls toward faster Olympic derivatives.", loading: "heavy to fast" },
      { index: 4, label: "Meso 4 - Specific Power", purpose: "Convert force into jump-specific output with managed contacts.", loading: "fast-heavy" },
      { index: 5, label: "Meso 5 - Elastic Conversion", purpose: "Express short-contact stiffness and approach-jump transfer.", loading: "maintenance" },
      { index: 6, label: "Meso 6 - Peak", purpose: "Reduce fatigue and express jump height while staying pain-free.", loading: "fresh-fast" }
    ];
    const library = this.exerciseLibrary(sourceProgram, profile);
    const sessions = [];
    const trainingDays = this.weeklyStructure(profile.trainingDaysPerWeek, profile.sportSchedule);
    const start = mondayOfWeek(startDate);

    for (let weekIndex = 0; weekIndex < 24; weekIndex += 1) {
      const mesocycle = Math.floor(weekIndex / 4) + 1;
      const week = (weekIndex % 4) + 1;
      trainingDays.forEach((schedule, sessionIndex) => {
        const date = new Date(start);
        date.setDate(start.getDate() + weekIndex * 7 + schedule.offset);
        sessions.push(this.session({
          date: date.toISOString().slice(0, 10),
          mesocycle,
          week,
          sessionIndex,
          meso: mesocycles[mesocycle - 1],
          library,
          profile,
          schedule
        }));
      });
    }

    return new TrainingProgram({
      sourceLabel: profile.sportSchedule.length > 0 ? "Sport-aware 24-week plan" : "Personalized 24-week plan from Gmail import",
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
    const imported = [...unique.values()];
    const defaults = this.defaultExerciseLibrary().filter((exercise) => !blocked.has(this.key(exercise.name)));
    const merged = new Map();
    const sourceOrder = /provisional/i.test(sourceProgram.sourceLabel) ? [...defaults, ...imported] : [...defaults, ...imported];
    for (const exercise of sourceOrder) {
      const key = this.key(`${exercise.category}:${exercise.name}`);
      if (!merged.has(key)) merged.set(key, exercise);
    }
    return [...merged.values()];
  }

  static defaultExerciseLibrary() {
    return [
      ["Knee pain rating", "joint prep", 1, "1-10", "readiness", "Gate jumping and loading decisions."],
      ["Achilles pain rating", "joint prep", 1, "1-10", "readiness", "Gate sprint and jump contacts."],
      ["Spanish Squat Iso", "isometric", 4, "45 sec", "tendon analgesic", "Use for patellar tendon pain/history; remove for PFP symptoms."],
      ["Patellar Tendon Isometric", "isometric", 4, "45 sec", "tendon analgesic", "Continue when tendon history is present."],
      ["Seated Calf Raise Iso", "isometric", 4, "45 sec", "soleus/Achilles", "Use for Achilles or soleus tendon capacity."],
      ["Toe Touch", "mobility", 1, "8", "controlled", "Open posterior chain before speed work."],
      ["Deep Squat", "mobility", 1, "6", "controlled", "Prepare knee, ankle, and hip ROM."],
      ["Long Lunge", "mobility", 1, "6/side", "controlled", "Open hip flexors and stride positions."],
      ["Leg Swings", "mobility", 1, "10/side", "smooth", "Prepare hips before sprinting."],
      ["Ankle Stretch", "mobility", 1, "8/side", "controlled", "Improve ankle positions for jumping."],
      ["Alternating Pigeon", "mobility", 1, "6/side", "controlled", "Open hip rotation."],
      ["Side Skip", "sprint drill", 2, "20m", "rhythm", "Lateral rhythm and stiffness."],
      ["B Skip", "sprint drill", 2, "20m", "technical", "Frontside mechanics."],
      ["Backward Run", "sprint drill", 2, "20m", "easy", "Knee-friendly warmup mechanics."],
      ["Carioca", "sprint drill", 2, "20m", "smooth", "Hip rhythm and coordination."],
      ["High Knee", "sprint drill", 2, "20m", "snappy", "Frontside stiffness."],
      ["Drops", "plyometric", 1, "pain-guided ramp", "low to high", "Start jump ramp with low landing demand."],
      ["Pogos", "plyometric", 1, "pain-guided ramp", "short contact", "Elastic stiffness without chasing volume."],
      ["Low Box Jump", "plyometric", 1, "pain-guided ramp", "crisp", "Low-risk jump coordination."],
      ["Broad Jump", "plyometric", 1, "pain-guided ramp", "max quality", "Horizontal power if tendon stays quiet."],
      ["Standing Vertical Jump", "plyometric", 1, "pain-guided ramp", "max quality", "Bilateral jump expression."],
      ["Approach Rhythm Jump", "plyometric", 1, "pain-guided ramp", "technical", "Bridge standing jumps to approach jumps."],
      ["Approach Jump", "plyometric", 1, "pain-guided ramp", "max quality", "Use only when pain allows progression."],
      ["Depth Jump", "plyometric", 1, "late mesocycle only", "short contact", "Late-stage reactive transfer; skip if tendon pain rises."],
      ["Dunk Attempt", "plyometric", 1, "fresh singles", "pain-free only", "Only when fresh, pain-free, and jump quality is high."],
      ["Power Clean", "Olympic lift", 5, "3", "technical-fast", "Rate of force development."],
      ["Hang Clean", "Olympic lift", 5, "3", "technical-fast", "Force-velocity bridge."],
      ["Paused Hang Clean", "Olympic lift", 4, "2-3", "controlled-fast", "Build positions before speed."],
      ["Faster Eccentric Hang Clean", "Olympic lift", 4, "2-3", "fast", "Velocity development."],
      ["Clean Pull", "Olympic lift", 4, "3", "fast", "High force pull without catch demand."],
      ["High Pull", "Olympic lift", 4, "3", "fast", "Explosive hip extension without catch demand."],
      ["Loaded Jump Squat", "power movement", 3, "3", "20% squat max", "Bridge maximal strength to jump-specific power; only pain-free."],
      ["Back Squat", "primary strength", 4, "3-5", "pain-free load", "Jump support work; do not chase numbers."],
      ["Front Squat", "primary strength", 4, "3-5", "controlled", "Upright force production."],
      ["Trap Bar Deadlift", "primary strength", 4, "3-5", "fast concentric", "Bilateral force with lower knee demand."],
      ["RDL", "secondary strength", 3, "6", "controlled", "Posterior-chain force support."],
      ["Hip Thrust", "secondary strength", 3, "6", "fast", "Hip extension force."],
      ["Nordic Eccentric", "accessory", 3, "5", "slow", "Hamstring resilience."],
      ["Split Squat", "secondary strength", 3, "6/side", "only if tendon okay", "Use when patellar tendon response is acceptable."],
      ["Walking Lunge", "secondary strength", 2, "8/side", "only if tendon okay", "Use when patellar tendon response is acceptable."],
      ["Toe Walks", "accessory", 2, "20m", "controlled", "Foot and calf capacity."],
      ["Heel Walks", "accessory", 2, "20m", "controlled", "Tibialis and foot strength."],
      ["Inversion Walks", "accessory", 2, "20m", "controlled", "Foot control."],
      ["Eversion Walks", "accessory", 2, "20m", "controlled", "Foot control."],
      ["Scrunch Walks", "accessory", 2, "20m", "controlled", "Intrinsic foot strength."],
      ["Single-Leg Calf Raise", "accessory", 3, "8/side", "full ROM", "Ankle stiffness and calf capacity."],
      ["Hip Abduction", "accessory", 3, "12/side", "controlled", "Hip support for knee tracking."],
      ["Hip Flexor Lift-Off", "accessory", 3, "8/side", "controlled", "Hip flexor strength and mobility."]
    ].map(([name, category, sets, reps, intensity, intent], index) => new Exercise({
      id: `default-${index}-${slug(name)}`,
      name,
      category,
      bucket: bucketForCategory(category),
      sets,
      reps,
      intensity,
      intent
    }));
  }

  static session({ date, mesocycle, week, sessionIndex, meso, library, profile, schedule }) {
    const isDeload = week === 4;
    const exercises = this.template(mesocycle, schedule)
      .flatMap((slot) => this.pick(library, slot, profile, isDeload, mesocycle, schedule))
      .map((exercise, index) => this.prescribe(exercise, { mesocycle, week, isDeload, index, schedule, profile }));
    return new WorkoutSession({
      id: `personal-m${mesocycle}-w${week}-d${sessionIndex + 1}`,
      date,
      title: `${schedule.title}${isDeload ? " deload" : ""}`,
      macrocyclePhase: meso.label,
      mesocycle,
      mesoLabel: meso.label,
      week,
      weekLabel: `Week ${week} - ${["Intro load", "Progression", "Peak loading", "Deload"][week - 1]}`,
      trainingEmphasis: schedule.emphasis,
      volumeClassification: isDeload ? "low" : week === 3 ? "moderate-high" : "moderate",
      intensity: this.intensity(mesocycle, isDeload),
      fatigueScore: this.fatigueScore(schedule, week, isDeload),
      adaptationTarget: this.adaptationTarget(mesocycle, schedule, isDeload),
      riskFlags: this.riskFlags(exercises, profile, schedule),
      buckets: bucketsFromExercises(exercises),
      readinessRules: readinessRulesFor(schedule.type),
      exercises
    });
  }

  static template(mesocycle, schedule) {
    if (schedule.type === "sport") {
      return schedule.intensity === "high" || schedule.jumpLoad === "high"
        ? [["joint prep", 2], ["isometric", 1], ["mobility", 2]]
        : [["joint prep", 2], ["mobility", 2]];
    }
    const base = [
      ["joint prep", 2],
      ["isometric", 1],
      ["mobility", 3]
    ];
    if (schedule.type === "jump") {
      const jumpSlots = [...base, ["sprint drill", 3], ["plyometric", mesocycle >= 5 ? 3 : 2], ["Olympic lift", 1]];
      if (this.allowsPowerBridge(mesocycle, schedule)) jumpSlots.push(["power movement", 1]);
      return [...jumpSlots, ["accessory", 1]];
    }
    if (schedule.type === "strength") {
      const strengthSlots = [["joint prep", 2], ["mobility", 2], ["Olympic lift", 1]];
      if (this.allowsPowerBridge(mesocycle, schedule)) strengthSlots.push(["power movement", 1]);
      return [...strengthSlots, ["primary strength", 1], ["secondary strength", 1], ["accessory", 2]];
    }
    if (schedule.type === "recovery") {
      return [["joint prep", 2], ["isometric", 2], ["mobility", 3], ["accessory", 3]];
    }
    return [["joint prep", 2], ["mobility", 3], ["general strength", 3], ["accessory", 3]];
  }

  static pick(library, [category, count], profile, isDeload, mesocycle, schedule) {
    let candidates = library
      .filter((exercise) => exercise.category === category)
      .filter((exercise) => !this.isHighRiskForProfile(exercise, profile, isDeload))
      .filter((exercise) => this.allowedByMeso(exercise, mesocycle));
    if (category === "plyometric") {
      candidates = this.prioritizeJumpRamp(candidates, mesocycle, schedule);
    }
    if (category === "Olympic lift") {
      candidates = this.prioritizeOlympicDerivatives(candidates, mesocycle, schedule);
    }
    if (schedule.type === "strength") {
      candidates = this.prioritizeStrengthSupport(candidates, category, schedule);
    }
    return this.rotate(candidates.length ? candidates : library.filter((exercise) => exercise.category === category), count);
  }

  static allowsPowerBridge(mesocycle, schedule) {
    if (schedule.type === "sport" || schedule.type === "recovery") return false;
    if (schedule.intensity === "high" || schedule.jumpLoad === "high") return false;
    if (mesocycle < 3 || mesocycle > 5) return false;
    if (schedule.type === "jump") return mesocycle >= 4;
    return true;
  }

  static prioritizeJumpRamp(candidates, mesocycle, schedule) {
    const early = ["drops", "pogos", "low box jump", "standing vertical jump", "approach rhythm jump", "approach jump"];
    const late = schedule.type === "jump"
      ? ["drops", "standing vertical jump", "approach rhythm jump", "approach jump", "depth jump", "dunk attempt"]
      : early;
    const order = mesocycle >= 5 ? late : early;
    return [...candidates].sort((a, b) => {
      const aIndex = order.indexOf(a.name.toLowerCase());
      const bIndex = order.indexOf(b.name.toLowerCase());
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }

  static rotate(items, count) {
    return items.slice(0, count);
  }

  static prioritizeOlympicDerivatives(candidates, mesocycle, schedule) {
    const earlyOrder = ["power clean", "hang clean", "clean pull", "high pull", "paused hang clean", "faster eccentric hang clean"];
    const forceVelocityOrder = ["clean pull", "high pull", "paused hang clean", "faster eccentric hang clean", "hang clean", "power clean"];
    const peakOrder = ["high pull", "faster eccentric hang clean", "clean pull", "hang clean", "power clean"];
    const order = mesocycle >= 5 ? peakOrder : mesocycle >= 3 || schedule.offset === 4 ? forceVelocityOrder : earlyOrder;
    return [...candidates].sort((a, b) => {
      const aIndex = order.indexOf(a.name.toLowerCase());
      const bIndex = order.indexOf(b.name.toLowerCase());
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }

  static prioritizeStrengthSupport(candidates, category, schedule) {
    if (schedule.offset !== 4) return candidates;
    const fridayOrder = {
      "Olympic lift": ["clean pull", "high pull", "hang clean", "faster eccentric hang clean", "power clean"],
      "power movement": ["loaded jump squat"],
      "primary strength": ["front squat", "trap bar deadlift", "back squat"],
      "secondary strength": ["hip thrust", "rdl", "split squat"],
      accessory: ["nordic eccentric", "single-leg calf raise", "hip abduction"]
    }[category];
    if (!fridayOrder) return candidates;
    return [...candidates].sort((a, b) => {
      const aIndex = fridayOrder.indexOf(a.name.toLowerCase());
      const bIndex = fridayOrder.indexOf(b.name.toLowerCase());
      return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
    });
  }

  static prescribe(exercise, { mesocycle, isDeload, index, schedule, profile }) {
    const sets = this.setsFor(exercise, mesocycle, isDeload);
    const prescribed = new Exercise({
      ...exercise.toJSON(),
      id: `p-${mesocycle}-${schedule.type}-${index}-${slug(exercise.name)}`,
      bucket: bucketForCategory(exercise.category),
      sets,
      reps: this.repsFor(exercise, mesocycle, isDeload),
      intensity: this.intensityFor(exercise, mesocycle, isDeload),
      completedSets: Array.from({ length: sets }, () => false)
    });
    const recommendation = buildLoadRecommendation(prescribed, profile, { mesocycle, isDeload });
    return new Exercise({
      ...prescribed.toJSON(),
      ...recommendation
    });
  }

  static setsFor(exercise, mesocycle, isDeload) {
    if (isDeload) return Math.min(2, Math.max(1, exercise.sets));
    if (exercise.category === "isometric") return 4;
    if (["warmup", "mobility", "joint prep"].includes(exercise.category)) return 1;
    if (exercise.category === "plyometric") return 1;
    if (exercise.category === "power movement") return isDeload ? 2 : mesocycle >= 5 ? 2 : 3;
    if (mesocycle === 1) return Math.min(4, Math.max(2, exercise.sets || 3));
    if (mesocycle === 2) return 4;
    if (mesocycle <= 4) return 3;
    return 2;
  }

  static repsFor(exercise, mesocycle, isDeload) {
    if (exercise.category === "isometric") return "45 sec";
    if (exercise.category === "plyometric") return "pain-guided ramp";
    if (exercise.category === "power movement") return isDeload ? "2 easy" : "3 fast";
    if (isDeload) return exercise.category === "primary strength" ? "3 easy" : exercise.reps;
    if (["warmup", "mobility", "joint prep", "sprint drill"].includes(exercise.category)) return exercise.reps;
    if (mesocycle === 1) return exercise.reps === "listed" ? "8-12" : exercise.reps;
    if (mesocycle === 2) return "3-5";
    if (mesocycle <= 4) return "2-5";
    return "2-4 fast";
  }

  static intensityFor(exercise, mesocycle, isDeload) {
    if (exercise.category === "isometric") return "mandatory if tendon pain; remove for PFP";
    if (exercise.category === "plyometric") return "1=no pain progress, 2=hold, 3=drop, 4+=stop";
    if (exercise.category === "power movement") {
      if (isDeload) return "10% squat max, crisp only";
      if (mesocycle === 3) return "20% squat max";
      if (mesocycle === 4) return "30% squat max";
      return "20% squat max, preserve freshness";
    }
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

  static fatigueScore(schedule, week, isDeload) {
    if (isDeload) return 2;
    if (schedule.type === "sport" && schedule.intensity === "high") return 4;
    if (schedule.type === "sport") return 3;
    if (schedule.type === "recovery") return 1;
    return Math.min(5, 2 + week + (schedule.type === "strength" ? 1 : 0));
  }

  static adaptationTarget(mesocycle, schedule, isDeload) {
    if (isDeload) return "Unload fatigue and preserve movement quality.";
    if (schedule.type === "sport") {
      return `${schedule.sport} counts as ${schedule.intensity} sport load and ${schedule.jumpLoad} jump load; support it without adding extra plyometrics.`;
    }
    if (schedule.type === "jump") return "Use the tendon pain guide to ramp from low-intensity contacts toward approach jumps only when pain allows.";
    if (schedule.type === "strength") return "Blend squat strength, Olympic derivatives, and light loaded jumps so force transfers toward jump-specific power.";
    if (schedule.type === "gpp") return "Improve movement quality, tendon health, hip strength, foot strength, and recovery.";
    if (schedule.type === "recovery") return "Reduce symptoms and maintain tendon capacity with low fatigue.";
    if (mesocycle === 1) return "Build tissue capacity and a bilateral force base without provoking the right knee.";
    if (mesocycle === 2) return "Increase force output while keeping sprint and jump contacts technical.";
    if (mesocycle <= 4) return "Raise force ceiling and convert it into jump-specific power.";
    if (mesocycle === 5) return "Convert strength into short-contact elastic output.";
    return "Express jump height with low fatigue and high freshness.";
  }

  static riskFlags(exercises, profile, schedule = null) {
    const flags = [];
    const names = exercises.map((exercise) => exercise.name.toLowerCase()).join(" ");
    if (schedule?.type === "sport" && schedule.jumpLoad === "high") flags.push(`${schedule.sport} already counts as jump exposure`);
    if (schedule?.type === "sport" && schedule.intensity === "medium") flags.push(`${schedule.sport} is moderate impact; avoid extra max jumping`);
    if (/loaded jump squat/.test(names)) flags.push("Loaded jump squats require pain-free knees and crisp bar speed");
    if (/lunge|squat|bound|jump|cut|step/.test(names)) flags.push("Monitor right patellar tendon response");
    if (/sprint|skip|snatch|clean|high knee|hip/.test(names)) flags.push("Warm hips thoroughly before speed or catch positions");
    if (/right patellar|jumper/i.test(profile.constraints)) flags.push("No painful reps; substitute if knee pain climbs during session");
    return [...new Set(flags)];
  }

  static isHighRiskForProfile(exercise, profile, isDeload) {
    const name = exercise.name.toLowerCase();
    if (!/right patellar|jumper/i.test(profile.constraints)) return false;
    if (isDeload && /bound|cut|lunge|depth|dunk/.test(name)) return true;
    return /max jump/.test(name);
  }

  static allowedByMeso(exercise, mesocycle) {
    const name = exercise.name.toLowerCase();
    if (/depth jump/.test(name)) return mesocycle >= 5;
    if (/dunk attempt/.test(name)) return mesocycle >= 6;
    return true;
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
    return this.weeklyStructure(daysPerWeek).map((day) => day.offset);
  }

  static weeklyStructure(daysPerWeek, sportSchedule = []) {
    const sports = normalizeSportSchedule(sportSchedule);
    if (sports.length > 0) {
      return this.sportAwareWeeklyStructure(daysPerWeek, sports);
    }
    const full = [
      { offset: 0, title: "Jump Day", type: "jump", emphasis: "jump quality and pain-guided intensity" },
      { offset: 1, title: "Strength Day", type: "strength", emphasis: "force production for jumping" },
      { offset: 2, title: "General Strength / Recovery", type: "gpp", emphasis: "movement quality and tendon health" },
      { offset: 3, title: "Jump Day", type: "jump", emphasis: "approach rhythm and elastic quality" },
      { offset: 4, title: "Strength Day", type: "strength", emphasis: "force-velocity support" },
      { offset: 5, title: "Recovery / Isometric Day", type: "recovery", emphasis: "tendon capacity and recovery" }
    ];
    const count = Math.min(6, Math.max(2, Number(daysPerWeek) || 6));
    if (count === 2) return [full[0], full[3]];
    if (count === 3) return [full[0], full[2], full[4]];
    if (count === 4) return [full[0], full[1], full[3], full[5]];
    if (count === 5) return full.slice(0, 5);
    return full;
  }

  static sportAwareWeeklyStructure(daysPerWeek, sports) {
    const sportDays = new Set(sports.map((sport) => dayOffset(sport.day)));
    const highJumpCount = sports.filter((sport) => sport.intensity === "high" || sport.jumpLoad === "high").length;
    const sportSessions = sports.map((sport) => ({
      offset: dayOffset(sport.day),
      title: `${sport.sport} (${capitalize(sport.intensity)})`,
      type: "sport",
      sport: sport.sport,
      intensity: sport.intensity,
      jumpLoad: sport.jumpLoad,
      emphasis: sport.jumpLoad === "high" ? "sport jump exposure and tendon management" : "sport load and movement quality"
    }));
    const supportCandidates = highJumpCount >= 2
      ? [
        { offset: 2, title: "Strength Support", type: "strength", emphasis: "force production without extra jump volume" },
        { offset: 4, title: "Strength Support", type: "strength", emphasis: "force-velocity support after sport load" },
        { offset: 5, title: "Recovery / Isometric Day", type: "recovery", emphasis: "tendon capacity and foot-ankle recovery" }
      ]
      : [
        { offset: 0, title: "Jump Day", type: "jump", emphasis: "jump quality and pain-guided intensity" },
        { offset: 2, title: "Strength Support", type: "strength", emphasis: "force production without extra jump volume" },
        { offset: 4, title: "Strength Support", type: "strength", emphasis: "force-velocity support" },
        { offset: 5, title: "Recovery / Isometric Day", type: "recovery", emphasis: "tendon capacity and recovery" }
      ];
    const supportSessions = supportCandidates.filter((session) => !sportDays.has(session.offset));
    const maxSessions = Math.max(sports.length, Math.min(6, Number(daysPerWeek) || 6));
    return [...sportSessions, ...supportSessions]
      .sort((a, b) => a.offset - b.offset)
      .slice(0, maxSessions);
  }
}

export class SeedProgramFactory {
  static create(startDate) {
    const mesocycles = [
      { index: 1, label: "Meso 1 - Tissue Capacity", purpose: "Build movement quality, tendon tolerance, and pain-free force production.", loading: "low-moderate" },
      { index: 2, label: "Meso 2 - Force Production", purpose: "Increase force output while jumps remain pain-guided.", loading: "moderate-heavy" },
      { index: 3, label: "Meso 3 - Force Velocity", purpose: "Move across the force-velocity curve with Olympic derivatives.", loading: "heavy to fast" },
      { index: 4, label: "Meso 4 - Specific Power", purpose: "Convert strength into higher-output jump patterns.", loading: "80-90%" },
      { index: 5, label: "Meso 5 - Elastic Conversion", purpose: "Convert force into bounce with reactive contacts and max jumps.", loading: "Maintenance only" },
      { index: 6, label: "Meso 6 - Peak", purpose: "Maximize freshness and jump expression.", loading: "Moderate-fast" }
    ];
    const sessions = [];
    const start = mondayOfWeek(startDate);
    const trainingDays = ProgramPersonalizer.weeklyStructure(6);

    for (let weekIndex = 0; weekIndex < 24; weekIndex += 1) {
      const mesocycle = Math.floor(weekIndex / 4) + 1;
      const week = (weekIndex % 4) + 1;
      trainingDays.forEach((schedule, sessionIndex) => {
        const date = new Date(start);
        date.setDate(start.getDate() + weekIndex * 7 + schedule.offset);
        sessions.push(this.sessionFor({
          date: date.toISOString().slice(0, 10),
          mesocycle,
          week,
          sessionIndex,
          meso: mesocycles[mesocycle - 1],
          schedule
        }));
      });
    }

    return new TrainingProgram({
      sourceLabel: "Provisional scaffold until emails are imported",
      mesocycles,
      sessions
    });
  }

  static sessionFor({ date, mesocycle, week, sessionIndex, meso, schedule }) {
    const weekLabels = ["Intro load", "Progression", "Peak loading", "Deload"];
    const isDeload = week === 4;
    const fatigueScore = isDeload ? 2 : Math.min(5, week + sessionIndex);
    const riskFlags = schedule.type === "jump" ? ["Use tendon pain guide before progressing jumps", "Keep contacts crisp"] : [];
    const title = `${schedule.title} ${isDeload ? "deload" : "session"}`;
    const exercises = this.exercises(mesocycle, schedule, isDeload);

    return new WorkoutSession({
      id: `m${mesocycle}-w${week}-d${sessionIndex + 1}`,
      date,
      title,
      macrocyclePhase: meso.label,
      mesocycle,
      mesoLabel: meso.label,
      week,
      weekLabel: `Week ${week} - ${weekLabels[week - 1]}`,
      trainingEmphasis: schedule.emphasis,
      volumeClassification: isDeload ? "low" : week === 3 ? "high" : "moderate",
      intensity: this.intensity(mesocycle, isDeload),
      fatigueScore,
      adaptationTarget: this.adaptationTarget(mesocycle, schedule, isDeload),
      riskFlags,
      buckets: bucketsFromExercises(exercises),
      readinessRules: readinessRulesFor(schedule.type),
      exercises
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

  static adaptationTarget(mesocycle, schedule, isDeload) {
    if (isDeload) return "Unload fatigue and realize adaptation from the prior three weeks.";
    if (schedule.type === "jump") return "Ramp jump intensity by tendon pain and jump quality instead of chasing volume.";
    if (schedule.type === "strength") return "Use strength work to support force production and bar speed for jumping.";
    if (schedule.type === "gpp") return "Accumulate movement quality, hip strength, foot strength, and tendon-friendly capacity.";
    if (schedule.type === "recovery") return "Use isometrics, mobility, and low-fatigue accessories to improve readiness.";
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

  static exercises(mesocycle, schedule, isDeload) {
    const menu = this.exerciseMenu(mesocycle, schedule, isDeload);
    return menu.map(([name, category, sets, reps, intensity, intent], index) => {
      const finalSets = isDeload ? Math.min(2, sets) : sets;
      return new Exercise({
        id: `${slug(name)}-${index}`,
        name,
        category,
        bucket: bucketForCategory(category),
        sets: finalSets,
        reps: isDeload ? deloadReps(category, reps) : reps,
        intensity: isDeload ? "easy, leave fresh" : intensity,
        intent
      });
    });
  }

  static exerciseMenu(mesocycle, schedule) {
    const jointHealth = [
      ["Knee pain rating", "joint prep", 1, "1-10", "readiness", "Decide if jumping or strength loading is allowed."],
      ["Achilles pain rating", "joint prep", 1, "1-10", "readiness", "Check tendon response before contacts."]
    ];
    const isometrics = [
      ["Spanish Squat Iso", "isometric", 4, "45 sec", "tendon analgesic", "Use for patellar tendon pain/history; remove for PFP symptoms."]
    ];
    const mobility = [
      ["Toe Touch", "mobility", 1, "8", "controlled", "Open posterior chain before speed work."],
      ["Deep Squat", "mobility", 1, "6", "controlled", "Prepare knee, ankle, and hip ROM."],
      ["Alternating Pigeon", "mobility", 1, "6/side", "controlled", "Open hip rotation."]
    ];
    const sprint = [
      ["Side Skip", "sprint drill", 2, "20m", "rhythm", "Lateral rhythm and stiffness."],
      ["B Skip", "sprint drill", 2, "20m", "technical", "Frontside mechanics."],
      ["High Knee", "sprint drill", 2, "20m", "snappy", "Frontside stiffness."]
    ];
    const earlyJumps = [
      ["Drops", "plyometric", 1, "pain-guided ramp", "1=progress, 2=hold, 3=drop, 4+=stop", "Start the ramp with low landing demand."],
      ["Standing Vertical Jump", "plyometric", 1, "pain-guided ramp", "max quality", "Progress only while pain and quality allow."],
      ["Approach Rhythm Jump", "plyometric", 1, "pain-guided ramp", "technical", "Bridge standing jumps to approach jumps."]
    ];
    const lateJumps = [
      ["Approach Jump", "plyometric", 1, "pain-guided ramp", "max quality", "Use when pain allows progression."],
      ["Depth Jump", "plyometric", 1, "late mesocycle only", "short contact", "Late-stage reactive transfer; skip if tendon pain rises."],
      ["Dunk Attempt", "plyometric", 1, "fresh singles", "pain-free only", "Only when fresh, pain-free, and jump quality is high."]
    ];
    const strengthA = [
      ["Power Clean", "Olympic lift", 5, "3", "technical-fast", "Rate of force development."],
      ...(mesocycle >= 3 && mesocycle <= 5 ? [["Loaded Jump Squat", "power movement", mesocycle >= 5 ? 2 : 3, "3 fast", mesocycle === 4 ? "30% squat max" : "20% squat max", "Bridge squat force to jump-specific power; only pain-free."]] : []),
      ["Back Squat", "primary strength", 4, "3-5", "pain-free load", "Jump support work; do not chase numbers."],
      ["RDL", "secondary strength", 3, "6", "controlled", "Posterior-chain force support."],
      ["Single-Leg Calf Raise", "accessory", 3, "8/side", "full ROM", "Ankle stiffness and calf capacity."]
    ];
    const strengthB = [
      [mesocycle >= 5 ? "High Pull" : "Clean Pull", "Olympic lift", 4, "3", "fast", "High force pull without catch demand."],
      ...(mesocycle >= 3 && mesocycle <= 5 ? [["Loaded Jump Squat", "power movement", mesocycle >= 5 ? 2 : 3, "3 fast", mesocycle === 4 ? "30% squat max" : "20% squat max", "Light loaded jump expression after force work; stop if tendon pain rises."]] : []),
      ["Front Squat", "primary strength", 4, "3-5", "controlled", "Upright force production."],
      ["Hip Thrust", "secondary strength", 3, "6", "fast", "Hip extension force."],
      ["Nordic Eccentric", "accessory", 3, "5", "slow", "Hamstring resilience."]
    ];
    const gpp = [
      ["Toe Walks", "accessory", 2, "20m", "controlled", "Foot and calf capacity."],
      ["Heel Walks", "accessory", 2, "20m", "controlled", "Tibialis and foot strength."],
      ["Scrunch Walks", "accessory", 2, "20m", "controlled", "Intrinsic foot strength."],
      ["Hip Abduction", "accessory", 3, "12/side", "controlled", "Hip support for knee tracking."],
      ["Split Squat", "secondary strength", 3, "6/side", "only if tendon okay", "Use when patellar tendon response is acceptable."]
    ];

    if (schedule.type === "jump") {
      return [...jointHealth, ...isometrics, ...mobility, ...sprint, ...(mesocycle >= 5 ? lateJumps : earlyJumps)];
    }
    if (schedule.type === "strength") {
      return [...jointHealth, ...mobility, ...(schedule.offset === 1 ? strengthA : strengthB)];
    }
    if (schedule.type === "recovery") {
      return [...jointHealth, ...isometrics, ...mobility, ...gpp.slice(0, 4)];
    }
    return [...jointHealth, ...mobility, ...gpp];
  }
}

function deloadReps(category, reps) {
  if (category === "plyometric") return "low-intensity ramp";
  if (category === "primary strength") return "3 easy";
  return reps;
}

class LegacySeedTemplates {
  static exercises(mesocycle, schedule, isDeload) {
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

    const byType = {
      jump: 0,
      strength: 1,
      gpp: 2,
      recovery: 2
    };
    const selected = (templates[mesocycle] ?? later)[byType[schedule.type] ?? 0];
    const bucketed = [
      ["Knee pain rating", "joint prep", 1, "1-10", "readiness", "Decide if jumping or strength loading is allowed."],
      ["Achilles pain rating", "joint prep", 1, "1-10", "readiness", "Check tendon response before contacts."],
      ...(schedule.type === "jump" || schedule.type === "recovery" ? [["Patellar tendon isometric", "isometric", 4, "45 sec", "pain modulation", "Continue for tendon history; remove if symptoms are PFP."]] : []),
      ...selected
    ];
    return bucketed.map(([name, category, sets, reps, intensity, intent], index) => {
      const finalSets = scale?.sets ?? sets;
      return new Exercise({
        id: `${slug(name)}-${index}`,
        name,
        category,
        bucket: bucketForCategory(category),
        sets: finalSets,
        reps: scale?.reps ?? reps,
        intensity: scale?.intensity ?? intensity,
        intent
      });
    });
  }
}

export function tendonPainDecision({ tendonPain, isoReducedPain, sessionType }) {
  const pain = Number(tendonPain);
  if ((sessionType === "jump" || sessionType === "plyometric") && isoReducedPain === false) {
    return { level: "stop", title: "No jumping today", detail: "Isometrics did not reduce pain to 1/10." };
  }
  if (pain <= 1) return { level: "go", title: "Progress intensity", detail: "Increase the jump ramp only if jump quality is high." };
  if (pain === 2) return { level: "hold", title: "Hold intensity", detail: "Stay at the same ramp level." };
  if (pain === 3) return { level: "caution", title: "Decrease intensity", detail: "Drop one ramp level and remain there for 3-5 jumps." };
  return { level: "stop", title: "Stop jumping", detail: "End the jump session and move to recovery work." };
}

export function exerciseWeightKey(name) {
  return slug(name);
}

export function parseLoadPrescription(text, exerciseName = "") {
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  if (!raw || lower === "as written") return null;

  const absoluteRange = lower.match(/\b(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs)\b/);
  if (absoluteRange) {
    return {
      type: "absolute-range",
      min: Number(absoluteRange[1]),
      max: Number(absoluteRange[2]),
      unit: normalizeWeightUnit(absoluteRange[3]),
      perHand: /\bdbs?\b|dumbbell/.test(lower),
      raw
    };
  }

  const absoluteSingle = lower.match(/\b(\d+(?:\.\d+)?)\s*(kg|kgs|lb|lbs)\b/);
  if (absoluteSingle) {
    return {
      type: "absolute",
      value: Number(absoluteSingle[1]),
      unit: normalizeWeightUnit(absoluteSingle[2]),
      perHand: /\bdbs?\b|dumbbell/.test(lower),
      raw
    };
  }

  const percentage = lower.match(/\b(\d+(?:\.\d+)?)\s*%/);
  if (percentage) {
    return {
      type: "percentage",
      percent: Number(percentage[1]),
      maxKey: maxKeyFromText(lower, exerciseName),
      appliesTo: appliesToFromText(lower),
      raw
    };
  }

  if (/same weight|heavier|lighter|work up|last week/.test(lower)) {
    return {
      type: "relative",
      raw
    };
  }

  return null;
}

export function buildLoadRecommendation(exercise, profile, context = {}) {
  if (!shouldEstimateLoad(exercise)) return {};
  const parsed = exercise.loadPrescription
    ?? parseLoadPrescription(exercise.intensity, exercise.name)
    ?? parseLoadPrescription(exercise.originalText, exercise.name)
    ?? inferredCoachPrescription(exercise, context);
  if (!parsed) return lastLoggedRecommendation(exercise, profile);

  const missing = missingMaxMessage(parsed, profile);
  if (missing) {
    return {
      loadPrescription: parsed,
      recommendedWeightKg: null,
      loadRecommendationLabel: missing,
      loadRecommendationSource: "profile-max"
    };
  }

  if (parsed.type === "percentage") {
    const maxKg = Number(profile?.maxLifts?.[parsed.maxKey] || 0);
    const kg = maxKg * (parsed.percent / 100);
    return {
      loadPrescription: parsed,
      recommendedWeightKg: kg,
      loadRecommendationLabel: recommendationLabelForPercentage(parsed, kg),
      loadRecommendationSource: parsed.source ?? loadSourceFromPrescription(parsed)
    };
  }

  if (parsed.type === "absolute") {
    const kg = unitToKg(parsed.value, parsed.unit);
    return {
      loadPrescription: parsed,
      recommendedWeightKg: kg,
      loadRecommendationLabel: `${formatNumber(parsed.value)}${parsed.unit}${parsed.perHand ? " each hand" : ""}`,
      loadRecommendationSource: "coach-import"
    };
  }

  if (parsed.type === "absolute-range") {
    const minKg = unitToKg(parsed.min, parsed.unit);
    const maxKg = unitToKg(parsed.max, parsed.unit);
    return {
      loadPrescription: parsed,
      recommendedWeightKg: maxKg,
      loadRecommendationLabel: `${formatNumber(parsed.min)}-${formatNumber(parsed.max)}${parsed.unit}${parsed.perHand ? " each hand" : ""}`,
      loadRecommendationSource: "coach-import",
      recommendedWeightRangeKg: [minKg, maxKg]
    };
  }

  return {
    loadPrescription: parsed,
    recommendedWeightKg: null,
    loadRecommendationLabel: parsed.raw,
    loadRecommendationSource: "coach-import"
  };
}

export function displayWeightFromKg(kg, unit) {
  const value = normalizeWeightUnit(unit) === "lb" ? Number(kg) * 2.2046226218 : Number(kg);
  if (!Number.isFinite(value)) return "";
  return Math.round(value * 10) / 10;
}

export function formatLoadRecommendation(exercise, profile, context = {}) {
  const recommendation = buildLoadRecommendation(exercise, profile, context);
  const source = recommendation.loadRecommendationSource || exercise.loadRecommendationSource;
  const label = recommendation.loadRecommendationLabel || exercise.loadRecommendationLabel;
  const prescription = recommendation.loadPrescription || exercise.loadPrescription;
  const sourceSuffix = loadSourceSuffix(source);
  if (!label && !prescription) return "";
  if (recommendation.recommendedWeightRangeKg || exercise.recommendedWeightRangeKg) {
    const [minKg, maxKg] = recommendation.recommendedWeightRangeKg || exercise.recommendedWeightRangeKg;
    const min = displayWeightFromKg(minKg, profile.weightUnit);
    const max = displayWeightFromKg(maxKg, profile.weightUnit);
    return `Recommended: ${min}-${max}${profile.weightUnit.toUpperCase()}${prescription?.perHand ? " each hand" : ""}${sourceSuffix}`;
  }
  const kg = recommendation.recommendedWeightKg ?? exercise.recommendedWeightKg;
  if (Number.isFinite(Number(kg)) && Number(kg) > 0 && prescription?.type === "percentage") {
    return `Recommended: ${prescription.percent}% ${maxLiftLabel(prescription.maxKey)} = ${displayWeightFromKg(kg, profile.weightUnit)}${profile.weightUnit.toUpperCase()}${prescription.appliesTo ? ` (${prescription.appliesTo})` : ""}${sourceSuffix}`;
  }
  if (Number.isFinite(Number(kg)) && Number(kg) > 0) {
    return `Recommended: ${displayWeightFromKg(kg, profile.weightUnit)}${profile.weightUnit.toUpperCase()}${prescription?.perHand ? " each hand" : ""}${sourceSuffix}`;
  }
  return source === "profile-max" ? label : `Recommendation note: ${label}`;
}

function shouldEstimateLoad(exercise) {
  const category = String(exercise?.category || "").toLowerCase();
  const name = String(exercise?.name || "").toLowerCase();
  if (/joint|mobility|warmup|flexibility|isometric|sprint|plyometric/.test(category)) return false;
  if (/pain rating|stretch|leg swing|pigeon|toe touch|ankle stretch/.test(name)) return false;
  return /olympic|strength|power movement|accessory/.test(category)
    || /squat|clean|snatch|pull|deadlift|rdl|lunge|split squat|hip thrust|calf raise|nordic|db|dumbbell|barbell|trap bar/.test(name);
}

function loadSourceFromPrescription(prescription) {
  if (prescription.source) return prescription.source;
  return /\bmax\b|coach-pattern|philosophy/i.test(prescription.raw || "") ? "profile-max" : "coach-import";
}

function loadSourceSuffix(source) {
  if (source === "profile-max") return " (based on profile max)";
  if (source === "last-logged") return " (based on last logged weight)";
  if (source === "coach-import") return " (from coach note)";
  return "";
}

function lastLoggedRecommendation(exercise, profile) {
  const saved = profile?.exerciseWeights?.[exerciseWeightKey(exercise?.name)];
  if (!saved?.kg) return {};
  return {
    loadPrescription: {
      type: "last-logged",
      raw: "last logged working weight"
    },
    recommendedWeightKg: saved.kg,
    loadRecommendationLabel: "Use last logged working weight as the starting point.",
    loadRecommendationSource: "last-logged"
  };
}

function unitToKg(value, unit) {
  return normalizeWeightUnit(unit) === "lb" ? Number(value) / 2.2046226218 : Number(value);
}

function normalizeWeightUnit(unit) {
  return String(unit || "kg").toLowerCase().startsWith("lb") ? "lb" : "kg";
}

function maxKeyFromText(text, exerciseName) {
  const combined = `${text} ${exerciseName}`.toLowerCase();
  if (/\bpc\b|power clean/.test(combined)) return "powerClean";
  if (/trap\s*bar/.test(combined)) return "trapBarDeadlift";
  if (/deadlift/.test(combined)) return "deadlift";
  if (/hip thrust/.test(combined)) return "hipThrust";
  return "squat";
}

function appliesToFromText(text) {
  const lastSets = text.match(/last\s+(\w+|\d+)\s+sets?/);
  if (!lastSets) return "";
  return `last ${lastSets[1]} sets`;
}

function missingMaxMessage(prescription, profile) {
  if (prescription.type !== "percentage") return "";
  const max = Number(profile?.maxLifts?.[prescription.maxKey] || 0);
  return max > 0 ? "" : `Enter ${maxLiftLabel(prescription.maxKey)} max to calculate this recommendation.`;
}

function recommendationLabelForPercentage(prescription, kg) {
  const appliesTo = prescription.appliesTo ? ` (${prescription.appliesTo})` : "";
  return `${prescription.percent}% ${maxLiftLabel(prescription.maxKey)} = ${formatNumber(kg)}kg${appliesTo}`;
}

function inferredCoachPrescription(exercise, { mesocycle = 1, isDeload = false } = {}) {
  const name = String(exercise?.name || "").toLowerCase();
  if (/power clean/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 50 : mesocycle <= 1 ? 60 : mesocycle === 2 ? 70 : mesocycle <= 4 ? 75 : 60,
      maxKey: "powerClean",
      appliesTo: "",
      raw: "coach-pattern power clean wave",
      source: "profile-max"
    };
  }
  if (/hang clean/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 45 : mesocycle <= 1 ? 55 : mesocycle === 2 ? 65 : mesocycle <= 4 ? 70 : 55,
      maxKey: "powerClean",
      appliesTo: "",
      raw: "coach-pattern hang clean wave",
      source: "profile-max"
    };
  }
  if (/back squat|front squat|deep squat|barbell deep squat/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 60 : mesocycle <= 1 ? 65 : mesocycle === 2 ? 70 : 75,
      maxKey: "squat",
      appliesTo: "",
      raw: "coach-pattern squat wave",
      source: "profile-max"
    };
  }
  if (/trap bar deadlift/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 55 : mesocycle <= 1 ? 65 : mesocycle === 2 ? 70 : 75,
      maxKey: "trapBarDeadlift",
      appliesTo: "",
      raw: "coach-pattern trap bar deadlift wave",
      source: "profile-max"
    };
  }
  if (/\brdl\b|romanian deadlift/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 40 : mesocycle <= 1 ? 50 : mesocycle === 2 ? 55 : 60,
      maxKey: "deadlift",
      appliesTo: "",
      raw: "coach-pattern posterior-chain support wave",
      source: "profile-max"
    };
  }
  if (/hip thrust/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 50 : mesocycle <= 1 ? 60 : mesocycle === 2 ? 70 : 75,
      maxKey: "hipThrust",
      appliesTo: "",
      raw: "coach-pattern hip thrust wave",
      source: "profile-max"
    };
  }
  if (/split squat|walking lunge/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 20 : mesocycle <= 1 ? 30 : mesocycle === 2 ? 35 : 40,
      maxKey: "squat",
      appliesTo: "",
      raw: "coach-pattern unilateral support wave",
      source: "profile-max"
    };
  }
  if (/snatch pull/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 45 : mesocycle <= 1 ? 50 : 55,
      maxKey: "powerClean",
      appliesTo: "",
      raw: "coach-pattern snatch pull wave",
      source: "profile-max"
    };
  }
  if (/power snatch/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 35 : mesocycle <= 1 ? 35 : mesocycle === 2 ? 40 : 45,
      maxKey: "powerClean",
      appliesTo: "",
      raw: "coach-pattern power snatch wave",
      source: "profile-max"
    };
  }
  if (/clean pull/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 80 : 90,
      maxKey: "powerClean",
      appliesTo: "",
      raw: "coach-pattern clean pull wave",
      source: "profile-max"
    };
  }
  if (/high pull/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 45 : mesocycle >= 5 ? 50 : 55,
      maxKey: "powerClean",
      appliesTo: "",
      raw: "coach-pattern high pull wave",
      source: "profile-max"
    };
  }
  if (/loaded jump squat|jump squat/.test(name)) {
    return {
      type: "percentage",
      percent: isDeload ? 10 : mesocycle === 4 ? 30 : 20,
      maxKey: "squat",
      appliesTo: "",
      raw: "philosophy loaded jump squat bridge",
      source: "profile-max"
    };
  }
  return null;
}

function maxLiftLabel(key) {
  const labels = {
    squat: "squat max",
    deadlift: "deadlift max",
    trapBarDeadlift: "trap bar deadlift max",
    powerClean: "Power Clean max",
    hipThrust: "hip thrust max"
  };
  return labels[key] ?? `${key} max`;
}

function formatNumber(value) {
  const rounded = Math.round(Number(value) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function bucketsFromExercises(exercises) {
  const ids = new Set(exercises.map((exercise) => exercise.bucket ?? bucketForCategory(exercise.category)));
  return PROGRAM_PHILOSOPHY.buckets.filter((bucket) => ids.has(bucket.id));
}

function defaultReadinessRules() {
  return readinessRulesFor("strength");
}

function readinessRulesFor(sessionType) {
  return {
    sessionType,
    kneePainScale: "1=no pain, 2=barely noticeable, 3=dull ache, 4=sharp pain begins, 5-10=stop",
    jumpRule: sessionType === "jump" ? "If isometrics do not reduce tendon pain to 1/10, do not jump today." : "Keep loading at 2-3/10 pain or lower; use slow tempo and controlled ROM if painful.",
    pfpRule: "Behind/around kneecap or position-dependent PFP symptoms: no isometrics and no working through pain."
  };
}

function bucketForCategory(category) {
  const value = String(category || "").toLowerCase();
  if (/joint|assessment|pain/.test(value)) return "joint-health";
  if (/iso/.test(value)) return "isometrics";
  if (/mobility|warmup|flexibility/.test(value)) return "dynamic-flexibility";
  if (/sprint|skip|run|carioca|knee/.test(value)) return "sprint-development";
  if (/plyometric|jump|bound|pogo|dunk/.test(value)) return "jump-session";
  if (/gpp|general|accessory|foot|calf|hip|tibialis|copenhagen/.test(value)) return "gpp-recovery";
  return "strength-support";
}

function normalizeSportSchedule(sportSchedule) {
  const source = Array.isArray(sportSchedule) ? sportSchedule : [];
  return source
    .map((item, index) => ({
      id: item?.id || `sport-${index}-${slug(`${item?.sport || "sport"}-${item?.day || "day"}`)}`,
      sport: String(item?.sport || "Sport").trim(),
      day: normalizeDay(item?.day),
      intensity: normalizeLoad(item?.intensity),
      jumpLoad: normalizeLoad(item?.jumpLoad ?? item?.intensity)
    }))
    .filter((item) => item.sport && item.day);
}

function normalizeDay(value) {
  const key = String(value || "").trim().toLowerCase();
  const match = WEEK_DAYS.find((day) => day.toLowerCase() === key || day.slice(0, 3).toLowerCase() === key.slice(0, 3));
  return match ?? "Monday";
}

function normalizeLoad(value) {
  const key = String(value || "").trim().toLowerCase();
  if (key === "low" || key === "medium" || key === "high") return key;
  return "medium";
}

function dayOffset(day) {
  return Math.max(0, WEEK_DAYS.indexOf(normalizeDay(day)));
}

function mondayOfWeek(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return date;
}

function capitalize(value) {
  return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
}

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
