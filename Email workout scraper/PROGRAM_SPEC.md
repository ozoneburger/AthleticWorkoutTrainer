# Jump Performance Program Spec

## Purpose

This app generates a jump-performance and athletic development program. It is not a bodybuilding program and not a powerlifting program.

The priority order is:

1. Pain reduction
2. Jump quality
3. Jump intensity
4. Movement velocity
5. Strength
6. Volume

Strength supports jumping. It is not the goal.

## Weekly Structure

Default week:

| Day | Focus |
| --- | --- |
| Monday | Jump Day |
| Tuesday | Strength Day |
| Wednesday | General Strength / Recovery |
| Thursday | Jump Day |
| Friday | Strength Day |
| Saturday | Recovery / Isometric Day |
| Sunday | Off |

Lower-frequency versions keep the same priority: jump quality first, strength support second, recovery capacity third.

## Buckets

Every session is built from buckets.

### 1. Joint Health

Always first.

- Knee pain rating, 1-10
- Achilles pain rating, 1-10
- Tendon assessment
- PFP screen: behind/around kneecap or position-dependent pain

This bucket decides whether jumping, loading, or recovery work is allowed.

### 2. Isometrics

Default tendon prescription:

- 4 x 45 sec

Included options:

- Spanish Squat Iso
- Patellar Tendon Isometric
- Wall Sit Iso
- Seated Calf Raise Iso
- Soleus Iso Hold

Rules:

- Tendon pain: mandatory.
- History of tendon pain: continue.
- PFP symptoms: remove isometrics.

### 3. Dynamic Flexibility

Always before sprinting or jumping.

- Toe Touch
- Deep Squat
- Long Lunge
- Leg Swings
- Ankle Stretch
- Alternating Pigeon
- Hip Mobility Flow

### 4. Sprint Development

Used for acceleration mechanics, elasticity, and movement prep.

- Side Skip
- B Skip
- Backward Run
- Carioca
- High Knee
- A-Skip
- Sprint Buildups

### 5. Jump Session

The most important bucket. It is pain-driven, not volume-driven.

Progression usually moves:

1. Drops
2. Standing jumps
3. Approach jumps

Included options:

- Drops
- Pogos
- Low Box Jump
- Broad Jump
- Standing Vertical Jump
- Approach Rhythm Jump
- Approach Jump
- Depth Jump, late mesocycles only
- Dunk Attempt, only pain-free and fresh

### 6. Strength Support

Strength is used to support force production, rate of force development, and velocity.

- Power Clean
- Hang Clean
- Paused Hang Clean
- Faster Eccentric Hang Clean
- Clean Pull
- Snatch Pull
- Back Squat
- Front Squat
- Trap Bar Deadlift
- RDL
- Hip Thrust
- Nordic Eccentric
- Split Squat or Lunge, only if patellar tendon is okay

Squat rule:

- Pain-free: use prescribed percentages.
- Painful: choose a load that stays near 2-3/10 pain, use slow tempo, and control ROM.

### 7. GPP / Recovery / Foot-Ankle

Used for movement quality, tendon health, hip strength, foot strength, and recovery.

- Toe Walks
- Heel Walks
- Inversion Walks
- Eversion Walks
- Scrunch Walks
- Single-Leg Calf Raise
- Tibialis Raise
- Copenhagen Plank
- Hip Abduction
- Hip Flexor Lift-Off
- Quad Stretching
- Light Barbell Circuit

## Tendon Pain Algorithm

Pain scale:

- 1: no pain
- 2: barely noticeable
- 3: dull ache
- 4: sharp pain begins
- 5-10: stop

Rules:

```text
if pain == 1:
    increase_intensity()

elif pain == 2:
    stay_at_same_intensity()

elif pain == 3:
    decrease_intensity()
    remain_for_3_to_5_jumps()

elif pain >= 4:
    stop_session()
```

Additional rule:

```text
if isometrics_do_not_reduce_pain_to_1:
    no_jumping_today()
```

## Load Management

If sessions become too long, cut in this order:

1. Remove General Day
2. Shorten Isometrics
3. Use Barbell Warmup
4. Remove Sprinting
5. Superset Accessories

Performance work stays. Everything else gets cut first.

