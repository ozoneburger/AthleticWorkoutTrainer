import assert from "node:assert/strict";
import {
  AthleteProfile,
  ProgramPersonalizer,
  TrainingProgram,
  buildLoadRecommendation,
  displayWeightFromKg,
  formatLoadRecommendation,
  parseLoadPrescription
} from "../src/program.js";
import { TeamBuildrParser } from "./team-buildr-parser.js";

const profile = AthleteProfile.fromJSON({
  maxLifts: {
    squat: 140,
    powerClean: 120
  }
});

assert.deepEqual(parseLoadPrescription("50% of your PC", "Snatch Pull"), {
  type: "percentage",
  percent: 50,
  maxKey: "powerClean",
  appliesTo: "",
  raw: "50% of your PC"
});

assert.equal(parseLoadPrescription("35% of your power clean", "Power Snatch").maxKey, "powerClean");
assert.equal(parseLoadPrescription("70% for the last two sets", "Barbell Deep Squats").appliesTo, "last two sets");

const dbRange = parseLoadPrescription("35-45lbs", "DB Walking Lunge");
assert.equal(dbRange.type, "absolute-range");
assert.equal(dbRange.unit, "lb");

assert.equal(parseLoadPrescription("same weight as last week", "Jump Squat").type, "relative");

const snatchPull = buildLoadRecommendation({
  name: "Snatch Pull",
  intensity: "55% of your PC"
}, profile);
assert.equal(Math.round(snatchPull.recommendedWeightKg), 66);

const squat = buildLoadRecommendation({
  name: "Back Squat",
  intensity: "70% for the last two sets"
}, profile);
assert.equal(Math.round(squat.recommendedWeightKg), 98);

const loadedJumpSquat = buildLoadRecommendation({
  name: "Loaded Jump Squat",
  intensity: "20% squat max"
}, profile);
assert.equal(Math.round(loadedJumpSquat.recommendedWeightKg), 28);

const highPull = buildLoadRecommendation({
  name: "High Pull",
  intensity: "fast"
}, profile, { mesocycle: 5 });
assert.equal(Math.round(highPull.recommendedWeightKg), 60);

const powerClean = buildLoadRecommendation({
  name: "Power Clean",
  intensity: "technical-fast"
}, profile, { mesocycle: 2 });
assert.equal(Math.round(powerClean.recommendedWeightKg), 84);

const formattedPowerClean = formatLoadRecommendation({
  name: "Power Clean",
  category: "Olympic lift",
  intensity: "technical-fast"
}, profile);
assert.match(formattedPowerClean, /based on profile max/);

const mobilityDeepSquat = buildLoadRecommendation({
  name: "Deep Squat",
  category: "mobility",
  intensity: "controlled"
}, profile);
assert.deepEqual(mobilityDeepSquat, {});
assert.equal(formatLoadRecommendation({
  name: "Deep Squat",
  category: "mobility",
  intensity: "controlled"
}, profile), "");

const lastLogged = buildLoadRecommendation({
  name: "Nordic Eccentric",
  category: "accessory",
  intensity: "slow"
}, AthleteProfile.fromJSON({
  exerciseWeights: {
    "nordic-eccentric": {
      exerciseName: "Nordic Eccentric",
      kg: 40,
      updatedAt: "2026-06-01T00:00:00.000Z"
    }
  }
}));
assert.equal(lastLogged.loadRecommendationSource, "last-logged");
assert.equal(lastLogged.recommendedWeightKg, 40);

const missing = buildLoadRecommendation({
  name: "Power Snatch",
  intensity: "35% of your power clean"
}, AthleteProfile.default());
assert.match(missing.loadRecommendationLabel, /Enter Power Clean max/);

assert.equal(displayWeightFromKg(80, "lb"), 176.4);

const parsedWorkout = new TeamBuildrParser().parseMessage({
  id: "load-check",
  subject: "TeamBuildr - Workout Reminder",
  internalDate: Date.now(),
  body: [
    "Here is your workout for June 1, 2026:",
    "A",
    "Barbell Deep Squats (5 X 5)",
    "last two sets @ 80%"
  ].join("\n")
});
assert.equal(parsedWorkout.exercises.length, 1);
assert.equal(parsedWorkout.exercises[0].intensity, "last two sets @ 80%");

const generated = ProgramPersonalizer.create(
  TrainingProgram.fromJSON({
    sourceLabel: "Provisional test scaffold",
    mesocycles: [],
    sessions: []
  }),
  profile,
  "2026-06-01"
);
const loadedJumpSessions = generated.sessions.filter((session) =>
  session.exercises.some((exercise) => exercise.name === "Loaded Jump Squat")
);
assert.ok(loadedJumpSessions.length > 0);
assert.ok(loadedJumpSessions.every((session) => session.mesocycle >= 3 && session.mesocycle <= 5));
assert.equal(
  generated.sessions.some((session) => session.mesocycle < 5 && session.exercises.some((exercise) => exercise.name === "Depth Jump")),
  false
);
assert.equal(
  generated.sessions.some((session) => session.mesocycle < 6 && session.exercises.some((exercise) => exercise.name === "Dunk Attempt")),
  false
);

console.log("Load recommendation checks passed.");
