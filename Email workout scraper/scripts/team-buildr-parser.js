const DAY_HEADER = /^here is your workout for\s+(.+?)\s*:\s*$/i;
const BLOCK_MARKER = /^[A-Z]$/;
const SET_REP_PATTERN = /\((\d+)\s*[xX]\s*([^)]+)\)/;
const REPS_ONLY_PATTERN = /^(?:x\s*)?(\d+)\s*(?:[xX]\s*)?(each|ea\.?|seconds?|secs?\.?|sec|s|reps?)$/i;

export class TeamBuildrParser {
  parseMessage({ id, subject, internalDate, body }) {
    const lines = this.cleanLines(body);
    const dateLine = lines.find((line) => DAY_HEADER.test(line));
    const workoutDate = dateLine ? this.parseWorkoutDate(dateLine) : this.dateFromInternalDate(internalDate);
    const contentStart = dateLine ? lines.indexOf(dateLine) + 1 : 0;
    const content = lines.slice(contentStart);
    const title = this.firstUsefulLine(content) ?? "Imported TeamBuildr workout";
    const exercises = this.parseExercises(content);

    return {
      id: `gmail-${id}`,
      sourceMessageId: id,
      sourceSubject: subject,
      date: workoutDate,
      title,
      macrocyclePhase: "Imported TeamBuildr",
      mesocycle: 0,
      mesoLabel: "Imported TeamBuildr",
      week: 0,
      weekLabel: "Email import",
      trainingEmphasis: title,
      volumeClassification: this.volumeFromExercises(exercises),
      intensity: this.sessionIntensity(exercises),
      fatigueScore: this.fatigueScore(exercises),
      adaptationTarget: this.adaptationTarget(exercises),
      riskFlags: this.riskFlags(exercises),
      exercises
    };
  }

  cleanLines(body) {
    const lines = body
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const footerIndex = lines.findIndex((line) => /^print or complete this workout online at/i.test(line));
    return lines
      .slice(0, footerIndex === -1 ? lines.length : footerIndex)
      .filter((line) => !/^Robert,?$/i.test(line))
      .filter((line) => !/^Workout Reminder$/i.test(line))
      .filter((line) => !/^Feedback requested$/i.test(line))
      .filter((line) => !/^How do we do this$/i.test(line))
      .filter((line) => !/^[-\s]{6,}$/.test(line));
  }

  parseWorkoutDate(line) {
    const match = line.match(DAY_HEADER);
    if (!match) return this.dateFromInternalDate(Date.now());
    const parsed = new Date(`${match[1]} 12:00:00`);
    if (Number.isNaN(parsed.getTime())) return this.dateFromInternalDate(Date.now());
    return parsed.toISOString().slice(0, 10);
  }

  dateFromInternalDate(internalDate) {
    const parsed = new Date(Number(internalDate));
    return parsed.toISOString().slice(0, 10);
  }

  firstUsefulLine(lines) {
    return lines.find((line) => !BLOCK_MARKER.test(line) && !line.startsWith("@") && !DAY_HEADER.test(line));
  }

  parseExercises(lines) {
    const exercises = [];
    let currentCategory = "general";
    let pendingLetter = null;
    let pendingPrescription = null;

    lines.forEach((line) => {
      if (DAY_HEADER.test(line)) return;
      if (BLOCK_MARKER.test(line)) {
        pendingLetter = line;
        return;
      }
      if (line.startsWith("@")) {
        const previous = exercises[exercises.length - 1];
        if (previous) previous.intensity = line.replace(/^@\s*/, "");
        return;
      }
      if (REPS_ONLY_PATTERN.test(line)) {
        pendingPrescription = line;
        return;
      }
      if (this.isCategoryLine(line)) {
        currentCategory = this.categoryFromLine(line);
        pendingPrescription = null;
        return;
      }
      if (this.isInstructionLine(line)) return;

      const category = pendingLetter ? this.categoryFromLetter(pendingLetter, currentCategory) : currentCategory;
      const exercise = this.exerciseFromLine({
        line,
        category,
        pendingLetter,
        pendingPrescription
      });
      exercises.push(exercise);
      pendingLetter = null;
    });

    return exercises.map((exercise, index) => ({
      ...exercise,
      id: `${exercise.category}-${index}-${slug(exercise.name)}`
    }));
  }

  exerciseFromLine({ line, category, pendingPrescription }) {
    const setRepMatch = line.match(SET_REP_PATTERN);
    const name = line.replace(SET_REP_PATTERN, "").trim();
    const pendingMatch = pendingPrescription?.match(REPS_ONLY_PATTERN);
    const sets = setRepMatch ? Number(setRepMatch[1]) : 1;
    const reps = setRepMatch ? setRepMatch[2].trim() : pendingMatch ? `${pendingMatch[1]} ${pendingMatch[2]}` : "listed";

    return {
      id: "",
      name,
      category,
      sets,
      reps,
      intensity: "as written",
      intent: this.intentFor(category, name),
      completedSets: Array.from({ length: sets }, () => false),
      originalText: line
    };
  }

  isCategoryLine(line) {
    return [
      /^joint health$/i,
      /^manuever$/i,
      /^maneuver$/i,
      /^closure$/i,
      /^dynamic flexibility/i,
      /^static flexibility/i,
      /^sprint development/i,
      /^hill sprint/i,
      /^body building circuit/i,
      /^bb circuit/i,
      /^general strength circuit/i,
      /^med ball circuit/i
    ].some((pattern) => pattern.test(line));
  }

  categoryFromLine(line) {
    if (/joint health/i.test(line)) return "joint prep";
    if (/manuever|maneuver|closure/i.test(line)) return "warmup";
    if (/dynamic flexibility|static flexibility/i.test(line)) return "mobility";
    if (/sprint development|hill sprint|resisted sprint/i.test(line)) return "sprint drill";
    if (/body building circuit|bb circuit|general strength circuit/i.test(line)) return "general strength";
    if (/med ball circuit/i.test(line)) return "medicine ball";
    return "general";
  }

  isInstructionLine(line) {
    return [
      /^complete sets$/i,
      /^record\s+/i,
      /^note\s*:/i,
      /^rest\s+/i,
      /^print or complete this workout online at/i,
      /^shop now$/i,
      /^to stop recieving/i,
      /^to stop receiving/i,
      /^click here$/i,
      /^nike\b/i,
      /^teambuildr blog/i,
      /^twitter$/i,
      /^facebook$/i,
      /^instagram$/i,
      /^google plus$/i
    ].some((pattern) => pattern.test(line));
  }

  categoryFromLetter(letter, fallback) {
    const map = {
      A: "Olympic lift",
      B: "primary strength",
      C: "accessory",
      D: "accessory",
      E: "accessory"
    };
    return map[letter] ?? fallback;
  }

  intentFor(category, name) {
    const lower = `${category} ${name}`.toLowerCase();
    if (lower.includes("snatch") || lower.includes("clean")) return "Rate of force development and power expression.";
    if (lower.includes("sprint") || lower.includes("skip") || lower.includes("bound")) return "Sprint mechanics, stiffness, and elastic preparation.";
    if (lower.includes("flexibility") || lower.includes("circle") || lower.includes("mountain") || lower.includes("pretzel")) return "Range of motion and movement readiness.";
    if (lower.includes("step up") || lower.includes("squat") || lower.includes("lunge")) return "Single-leg force and positional strength.";
    if (lower.includes("plank")) return "Trunk stiffness and force transfer.";
    return "Imported from TeamBuildr; confirm adaptation target during review.";
  }

  volumeFromExercises(exercises) {
    const totalSets = exercises.reduce((sum, exercise) => sum + Number(exercise.sets || 0), 0);
    if (totalSets >= 35) return "high";
    if (totalSets >= 18) return "moderate";
    return "low";
  }

  sessionIntensity(exercises) {
    const notes = exercises.map((exercise) => exercise.intensity).filter((value) => value && value !== "as written");
    return notes.length ? notes.join("; ") : "as written";
  }

  fatigueScore(exercises) {
    const volume = exercises.reduce((sum, exercise) => sum + Number(exercise.sets || 0), 0);
    const hasSprint = exercises.some((exercise) => /sprint|bound/i.test(exercise.name));
    const hasOlympic = exercises.some((exercise) => /snatch|clean|pull/i.test(exercise.name));
    return Math.min(5, Math.max(1, Math.round(volume / 12) + (hasSprint ? 1 : 0) + (hasOlympic ? 1 : 0)));
  }

  adaptationTarget(exercises) {
    const names = exercises.map((exercise) => exercise.name.toLowerCase()).join(" ");
    if (names.includes("snatch") || names.includes("clean")) return "Prepare tissues, rehearse sprint mechanics, and express power through Olympic lifting.";
    if (names.includes("sprint")) return "Build stiffness, sprint rhythm, and lower-leg readiness.";
    return "Imported TeamBuildr session; review against the macrocycle once more emails are loaded.";
  }

  riskFlags(exercises) {
    const flags = [];
    const names = exercises.map((exercise) => exercise.name.toLowerCase()).join(" ");
    if (/step up|squat|lunge|bound|jump/.test(names)) flags.push("Monitor right patellar tendon response");
    if (/sprint|snatch|clean|high knee/.test(names)) flags.push("Respect hip tightness during warmup and catch positions");
    return flags;
  }
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
