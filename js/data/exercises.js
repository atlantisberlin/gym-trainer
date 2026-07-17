// ─── Übungsbibliothek ───────────────────────────────────────────────────────
// Namen sind identisch zur alten App (wichtig für die Daten-Migration).
// m = Muskelgruppen, eq = Equipment, bw = Körpergewicht, t = zeitbasiert (Sek.),
// lk = Anleitungs-Slug auf strongermobileapp.com

function X(id, n, m, eq, opt = {}) {
  return { id, n, m, eq, ...opt };
}

export const LIBRARY = [
  // ── Brust ──
  X('barbell-bench-press', 'Barbell Bench Press', ['Brust', 'Trizeps'], 'Langhantel', { lk: 'barbell-bench-press' }),
  X('incline-bench-press', 'Incline Bench Press', ['Brust', 'Schultern'], 'Langhantel', { lk: 'incline-bench-press' }),
  X('close-grip-bench-press', 'Close Grip Bench Press', ['Trizeps', 'Brust'], 'Langhantel', { lk: 'close-grip-bench-press' }),
  X('dumbbell-press', 'Dumbbell Press', ['Brust'], 'Kurzhantel', { lk: 'dumbbell-press' }),
  X('incline-dumbbell-press', 'Incline Dumbbell Press', ['Brust', 'Schultern'], 'Kurzhantel', { lk: 'incline-dumbbell-press' }),
  X('seated-chest-press-machine', 'Seated Chest Press Machine', ['Brust'], 'Maschine', { lk: 'seated-chest-press-machine' }),
  X('pec-deck-machine', 'Pec Deck Machine', ['Brust'], 'Maschine', { lk: 'pec-deck-machine' }),
  X('cable-crossover', 'Cable Crossover', ['Brust'], 'Kabel', { lk: 'cable-crossover' }),
  X('cable-fly-high-to-low', 'Cable Fly High to Low', ['Brust'], 'Kabel', { lk: 'cable-fly-high-to-low' }),
  X('dips', 'Dips', ['Brust', 'Trizeps'], 'Körpergewicht', { bw: true, lk: 'dips' }),
  X('weighted-dips', 'Weighted Dips', ['Brust', 'Trizeps'], 'Sonstiges', { lk: 'weighted-dips' }),
  X('push-up', 'Push-Up', ['Brust', 'Trizeps'], 'Körpergewicht', { bw: true, lk: 'push-up' }),

  // ── Schultern ──
  X('military-press', 'Military Press', ['Schultern', 'Trizeps'], 'Langhantel', { lk: 'military-press' }),
  X('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', ['Schultern'], 'Kurzhantel', { lk: 'dumbbell-shoulder-press' }),
  X('arnold-press', 'Arnold Press', ['Schultern'], 'Kurzhantel', { lk: 'arnold-press' }),
  X('shoulder-press-machine', 'Shoulder Press Machine', ['Schultern'], 'Maschine', { lk: 'shoulder-press-machine' }),
  X('dumbbell-lateral-raise', 'Dumbbell Lateral Raise', ['Schultern'], 'Kurzhantel', { lk: 'dumbbell-lateral-raise' }),
  X('cable-lateral-raise', 'Cable Lateral Raise', ['Schultern'], 'Kabel', { lk: 'cable-lateral-raise' }),
  X('lateral-raise-machine', 'Lateral Raise Machine', ['Schultern'], 'Maschine', { lk: 'lateral-raise-machine' }),
  X('face-pull', 'Face Pull', ['Schultern', 'Rücken'], 'Kabel', { lk: 'face-pull' }),
  X('cable-rear-delt-fly', 'Cable Rear Delt Fly', ['Schultern'], 'Kabel', { lk: 'cable-rear-delt-fly' }),
  X('reverse-fly-machine', 'Reverse Fly Machine', ['Schultern'], 'Maschine'),

  // ── Rücken / Lats ──
  X('deadlift', 'Deadlift', ['Rücken', 'Beinbeuger', 'Gesäß'], 'Langhantel', { lk: 'deadlift' }),
  X('sumo-deadlift', 'Sumo Deadlift', ['Gesäß', 'Beinbeuger', 'Rücken'], 'Langhantel'),
  X('barbell-row', 'Barbell Row', ['Rücken', 'Lats'], 'Langhantel', { lk: 'barbell-row' }),
  X('t-bar-row', 'T-Bar Row', ['Rücken', 'Lats'], 'Maschine', { lk: 't-bar-row' }),
  X('dumbbell-row', 'Dumbbell Row', ['Rücken', 'Lats'], 'Kurzhantel', { lk: 'dumbbell-row' }),
  X('chest-supported-row', 'Chest Supported Row', ['Rücken'], 'Kurzhantel'),
  X('cable-row', 'Cable Row', ['Rücken', 'Lats'], 'Kabel', { lk: 'cable-row' }),
  X('seated-row-machine', 'Seated Row Machine', ['Rücken'], 'Maschine', { lk: 'seated-row-machine' }),
  X('iso-lateral-high-row', 'Iso Lateral High Row', ['Rücken', 'Lats'], 'Maschine', { lk: 'iso-lateral-high-row' }),
  X('pulldown', 'Pulldown', ['Lats'], 'Kabel', { lk: 'pulldown' }),
  X('straight-arm-pulldown', 'Straight Arm Pulldown', ['Lats'], 'Kabel'),
  X('pull-up', 'Pull-Up', ['Lats', 'Bizeps'], 'Körpergewicht', { bw: true, lk: 'pull-up' }),
  X('chin-up', 'Chin Up', ['Lats', 'Bizeps'], 'Körpergewicht', { bw: true, lk: 'chin-up' }),
  X('wide-grip-pull-up', 'Wide Grip Pull Up', ['Lats'], 'Körpergewicht', { bw: true, lk: 'wide-grip-pull-up' }),
  X('weighted-pull-up', 'Weighted Pull Up', ['Lats', 'Bizeps'], 'Sonstiges', { lk: 'weighted-pull-up' }),
  X('hyperextension', 'Hyperextension', ['Rücken', 'Gesäß'], 'Körpergewicht', { bw: true, lk: 'hyperextension' }),
  X('good-morning', 'Good Morning', ['Beinbeuger', 'Rücken'], 'Langhantel'),
  X('barbell-shrug', 'Barbell Shrug', ['Rücken'], 'Langhantel'),

  // ── Bizeps / Unterarme ──
  X('barbell-bicep-curl', 'Barbell Bicep Curl', ['Bizeps'], 'Langhantel', { lk: 'barbell-bicep-curl' }),
  X('ez-bar-curl', 'EZ Bar Curl', ['Bizeps'], 'EZ-Stange', { lk: 'ez-bar-curl' }),
  X('dumbbell-bicep-curl', 'Dumbbell Bicep Curl', ['Bizeps'], 'Kurzhantel', { lk: 'dumbbell-bicep-curl' }),
  X('incline-dumbbell-curl', 'Incline Dumbbell Curl', ['Bizeps'], 'Kurzhantel', { lk: 'incline-dumbbell-curl' }),
  X('hammer-curl', 'Hammer Curl', ['Bizeps', 'Unterarme'], 'Kurzhantel', { lk: 'hammer-curl' }),
  X('concentration-curl', 'Concentration Curl', ['Bizeps'], 'Kurzhantel'),
  X('preacher-curl-machine', 'Preacher Curl Machine', ['Bizeps'], 'Maschine', { lk: 'preacher-curl-machine' }),
  X('reverse-curl', 'Reverse Curl', ['Unterarme', 'Bizeps'], 'EZ-Stange'),
  X('wrist-curl', 'Wrist Curl', ['Unterarme'], 'Kurzhantel'),
  X('dead-hang', 'Dead Hang', ['Unterarme', 'Lats'], 'Körpergewicht', { bw: true, t: true, lk: 'dead-hang' }),
  X('farmers-walk', "Farmer's Walk", ['Unterarme', 'Core'], 'Kurzhantel', { t: true }),

  // ── Trizeps ──
  X('rope-pushdown', 'Rope Pushdown', ['Trizeps'], 'Kabel', { lk: 'rope-pushdown' }),
  X('bar-pushdown', 'Bar Pushdown', ['Trizeps'], 'Kabel', { lk: 'bar-pushdown' }),
  X('rope-overhead-extension', 'Rope Overhead Extension', ['Trizeps'], 'Kabel', { lk: 'rope-overhead-extension' }),
  X('ez-bar-skullcrusher', 'EZ Bar Skullcrusher', ['Trizeps'], 'EZ-Stange', { lk: 'ez-bar-skullcrusher' }),
  X('machine-tricep-extension', 'Machine Tricep Extension', ['Trizeps'], 'Maschine', { lk: 'machine-tricep-extension' }),

  // ── Beine / Gesäß ──
  X('barbell-back-squat', 'Barbell Back Squat', ['Quadrizeps', 'Gesäß'], 'Langhantel', { lk: 'barbell-back-squat' }),
  X('front-squat', 'Front Squat', ['Quadrizeps', 'Core'], 'Langhantel'),
  X('goblet-squat', 'Goblet Squat', ['Quadrizeps', 'Gesäß'], 'Kurzhantel'),
  X('hack-squat', 'Hack Squat', ['Quadrizeps'], 'Maschine'),
  X('leg-press', 'Leg Press', ['Quadrizeps', 'Gesäß'], 'Maschine', { lk: 'leg-press' }),
  X('bulgarian-split-squat', 'Bulgarian Split Squat', ['Quadrizeps', 'Gesäß'], 'Kurzhantel', { lk: 'bulgarian-split-squat' }),
  X('walking-lunge', 'Walking Lunge', ['Quadrizeps', 'Gesäß'], 'Kurzhantel'),
  X('leg-extension', 'Leg Extension', ['Quadrizeps'], 'Maschine', { lk: 'leg-extension' }),
  X('leg-curl', 'Leg Curl', ['Beinbeuger'], 'Maschine', { lk: 'leg-curl' }),
  X('barbell-rdl', 'Barbell RDL', ['Beinbeuger', 'Gesäß'], 'Langhantel', { lk: 'barbell-rdl' }),
  X('dumbbell-rdl', 'Dumbbell RDL', ['Beinbeuger', 'Gesäß'], 'Kurzhantel', { lk: 'dumbbell-rdl' }),
  X('hip-thrust', 'Hip Thrust', ['Gesäß', 'Beinbeuger'], 'Langhantel', { lk: 'hip-thrust' }),
  X('hip-abductor', 'Hip Abductor', ['Gesäß'], 'Maschine', { lk: 'hip-abductor' }),
  X('calf-raises', 'Calf Raises', ['Waden'], 'Maschine', { lk: 'calf-raises' }),
  X('standing-dumbbell-calf-raise', 'Standing Dumbbell Calf Raise', ['Waden'], 'Kurzhantel', { lk: 'standing-dumbbell-calf-raise' }),
  X('seated-calf-raise', 'Seated Calf Raise', ['Waden'], 'Maschine'),

  // ── Core ──
  X('plank', 'Plank', ['Core'], 'Körpergewicht', { bw: true, t: true, lk: 'plank' }),
  X('side-plank', 'Side Plank', ['Core'], 'Körpergewicht', { bw: true, t: true }),
  X('crunch', 'Crunch', ['Core'], 'Körpergewicht', { bw: true, lk: 'crunch' }),
  X('cable-crunch', 'Cable Crunch', ['Core'], 'Kabel'),
  X('hanging-knee-raise', 'Hanging Knee Raise', ['Core'], 'Körpergewicht', { bw: true, lk: 'hanging-knee-raise' }),
  X('leg-raise', 'Leg Raise', ['Core'], 'Körpergewicht', { bw: true, lk: 'leg-raise' }),
  X('russian-twist', 'Russian Twist', ['Core'], 'Körpergewicht', { bw: true, lk: 'russian-twist' }),
];

export const EQUIPMENT = ['Langhantel', 'Kurzhantel', 'Maschine', 'Kabel', 'Körpergewicht', 'EZ-Stange', 'Sonstiges'];

export function exerciseLink(ex) {
  return ex.lk ? `https://www.strongermobileapp.com/exercises/${ex.lk}` : null;
}
