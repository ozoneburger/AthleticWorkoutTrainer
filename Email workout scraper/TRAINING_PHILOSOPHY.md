# Training Philosophy Knowledge Base

## Purpose

This document defines the training principles the app should preserve when generating or adjusting programs. It is a local knowledge base for the product, not a medical diagnosis tool.

The app should generate jump-performance programming that improves vertical jump, force production, rate of force development, stretch-shortening-cycle ability, sport readiness, and tendon tolerance without treating lifting numbers as the primary outcome.

## Non-Negotiable Hierarchy

The app must prioritize:

1. Pain reduction
2. Jump quality
3. Jump intensity
4. Movement velocity
5. Strength
6. Volume

Volume is last. Strength supports jumping. Jump quality and tendon response decide progression.

## Evidence-Backed Principles

### 1. Use Combined Training, Not One Exercise Category

The app should combine resistance training, Olympic-lift derivatives, and plyometrics across a periodized plan.

Source evidence from attached research notes:

> "no single exercise is optimal"

> "The strongest evidence supports combined training"

Implementation principle:

- Do not build the program around only squats, only Olympic lifts, or only plyometrics.
- Keep the weekly mix biased toward sport schedule, readiness, and tendon response.
- When sport already provides high jump exposure, preserve strength and recovery rather than adding extra plyometrics.

### 2. Olympic-Lift Derivatives Are Power Tools

The app should use Olympic-lift derivatives for rate of force development, concentric power, and force-velocity development.

Preferred exercises:

- Power Clean
- Hang Clean
- Clean Pull
- Snatch Pull
- Power Snatch
- High Pull

Source evidence from attached research notes:

> "Olympic weightlifting training improves vertical jump height"

> "power clean performance corrected for body weight had a high correlation"

Implementation principle:

- Use Power Clean max as the primary reference for clean/snatch derivative load recommendations.
- Keep Olympic derivatives technical and fast.
- Avoid grinding Olympic-lift reps.
- Use clean pulls or snatch pulls when catch positions are not appropriate.

### 3. Plyometrics Are Powerful but Must Be Readiness-Gated

The app should include plyometrics, but they must be pain-guided and sport-load-aware.

Preferred progression:

1. Low contacts and drops
2. Standing jumps
3. Approach rhythm jumps
4. Approach jumps
5. Depth jumps in late mesocycles only
6. Dunk attempts only when pain-free and fresh

Source evidence from attached research notes:

> "Plyometric training uses the stretch-shortening cycle"

> "Depth jumps utilize gravitational potential energy"

> "CMJs are sport-specific"

Implementation principle:

- High volleyball days already count as jump exposure.
- Do not add dedicated jump sessions before or after high-jump sport days unless the athlete explicitly adjusts load and readiness supports it.
- Depth jumps are late-stage tools, not default early-cycle work.
- Dunk attempts are expression/testing, not conditioning volume.

### 4. Squats Build the Force Base

The app should use squat patterns to build maximal and usable lower-body force, but squats remain support work for jumping.

Preferred exercises:

- Back Squat
- Front Squat
- Barbell Deep Squat
- Trap Bar Deadlift where knee load needs management
- Loaded Jump Squat only when appropriate and pain-free

Source evidence from attached research notes:

> "Back squat – Builds maximal leg strength"

> "best when combined with explosive exercises"

Implementation principle:

- Use squat max for squat-family load recommendations.
- If pain-free, use planned percentages.
- If painful, reduce load to a controlled 2-3/10 pain ceiling, slow tempo, and controlled ROM.
- Do not chase squat numbers at the expense of jump quality or tendon status.

### 5. Loaded Jump Squats Bridge Strength and Power

Loaded jump squats may be useful when the athlete has enough force base, readiness, and tendon tolerance.

Source evidence from attached research notes:

> "Loaded SJs with 10–40% of 1RM back squat"

Implementation principle:

- Treat loaded jump squats as a power bridge, not heavy strength work.
- Use light-to-moderate loads based on squat max.
- Do not prescribe loaded jumps on high volleyball weeks unless sport load has been reduced.

### 6. Periodization Matters

The app should use progression waves rather than adding weight every week forever.

Source evidence from attached research notes:

> "applied with progressive overload and periodization"

> "Within-week variation"

Implementation principle:

- Use mesocycles and deload weeks.
- Use high, medium, and low stress exposure across the week.
- Respect sport days as training stress.
- Use deload/reset first when progress stalls.
- Do not solve plateaus by automatically adding volume.

### 7. Training Frequency Should Match Recovery and Sport Load

The app should not blindly apply a fixed weekly template when basketball and volleyball are present.

Source evidence from attached research notes:

> "2–3 sessions per week"

Implementation principle:

- Basketball and volleyball count as training stress.
- High-jump volleyball counts as jump exposure.
- Strength support and recovery should fill the gaps around sport, not stack on top of it.
- Missed or skipped sport sessions should create a one-date override, not permanently alter the recurring schedule.

### 8. Rest Must Match the Quality Target

The app should distinguish between elastic/plyometric rest and heavy strength rest.

Source evidence from attached research notes:

> "15–90 seconds for plyometrics"

> "3–5 minutes for heavy resistance exercises"

Implementation principle:

- Jump and plyometric work should preserve crisp contacts and full intent.
- Heavy strength work needs enough rest to avoid turning force work into conditioning.
- If sessions run long, cut accessories before performance work.

## Load Recommendation Rules

The app should make load recommendations from reliable sources in this order:

1. Parsed coach/import prescription
2. Profile max lifts
3. Last logged working weight
4. Raw coach note when calculation is not possible

Examples:

- `50% of your PC` uses Power Clean max.
- `35% of your power clean` uses Power Clean max.
- `70% for the last two sets` uses the relevant lift max, usually squat for squat-family work.
- `35-45lbs` is an absolute dumbbell range and should show the raw note.
- `same weight as last week` is relative and should not invent a number.

If a max lift is missing, the app should prompt for it rather than hallucinating a load.

## Plateau Rules

When progress stalls for the same exercise across repeated exposures:

1. Check pain/readiness first.
2. Check sport load that week.
3. Use deload/reset before adding volume.
4. Consider a close variation only after symptoms, fatigue, and technique are accounted for.
5. Never add jump volume to solve a strength plateau during high-jump sport weeks.

## Sport-Aware Rules

Basketball and volleyball are training stress, not casual cardio.

Default assumptions:

- Basketball medium intensity = moderate impact and deceleration load.
- Volleyball high intensity = high jump exposure.

Implementation principle:

- Volleyball high days replace dedicated jump exposure.
- Basketball medium days should not be stacked with max jump work.
- Strength work should support sport performance without creating lingering fatigue.
- Recovery/isometrics/foot-ankle work should protect consistency.

## App Behavior Contract

Any future generator, AI layer, or recommendation feature must preserve these rules:

- Do not recommend training through sharp pain.
- Do not add volume as the first progression answer.
- Do not stack high plyometric work around high-jump sport days.
- Do not use imported coach workouts as blind templates without sport and readiness context.
- Do not invent load recommendations when maxes or source prescriptions are missing.
- Do keep raw coach notes visible when parsing is uncertain.
- Do prefer conservative adjustments when tendon status is ambiguous.

## References From Attached Research Notes

- Waller M, Gersick M, Holman D. Various Jump Training Styles for Improvement of Vertical Jump Performance. Strength & Conditioning Journal. 2013;35(1):82-89. DOI: 10.1519/ssc.0b013e318276c36e
- Fatouros IG et al. Evaluation of Plyometric Exercise Training, Weight Training, and Their Combination on Vertical Jumping Performance and Leg Strength. Journal of Strength and Conditioning Research. 2000;14(4):470-476. DOI: 10.1519/00124278-200011000-00016
- Carlson K, Magnusen M, Walters P. Effect of Various Training Modalities on Vertical Jump. Research in Sports Medicine. 2009;17(2):84-94. DOI: 10.1080/15438620902900351
- Harries SK, Lubans DR, Callister R. Resistance training to improve power and sports performance in adolescent athletes: A systematic review and meta-analysis. Journal of Science and Medicine in Sport. 2012;15(6):532-540. DOI: 10.1016/j.jsams.2012.02.005
- Hackett D, Davies T, Soomro N, Halaki M. Olympic weightlifting training improves vertical jump height in sportspeople: a systematic review with meta-analysis. British Journal of Sports Medicine. 2015;50(14):865-872. DOI: 10.1136/bjsports-2015-094951
- Arabatzi F, Kellis E, Saez-Saez De Villarreal E. Vertical Jump Biomechanics after Plyometric, Weight Lifting, and Combined Training. Journal of Strength and Conditioning Research. 2010;24(9):2440-2448. DOI: 10.1519/jsc.0b013e3181e274ab
- Channell BT, Barfield JP. Effect of Olympic and Traditional Resistance Training on Vertical Jump Improvement in High School Boys. Journal of Strength and Conditioning Research. 2008;22(5):1522-1527. DOI: 10.1519/jsc.0b013e318181a3d0
- McClenton LS, Brown LE, Coburn JW, Kersey RD. The Effect of Short-Term VertiMax vs. Depth Jump Training on Vertical Jump Performance. Journal of Strength and Conditioning Research. 2008;22(2):321-325. DOI: 10.1519/jsc.0b013e3181639f8f
