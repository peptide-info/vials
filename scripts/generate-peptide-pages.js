const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'peptides');

// Asset cache-busting versions — keep in sync with the live pages so newly
// generated files reference the same script versions as everything else.
const NAV_VER = 21;
const VIAL_VER = 6;

// Files this generator must never write, even with --force. These are
// hand-authored and don't come from the page() template.
const EXCLUSIONS = new Set([
  'bac-water-3ml.html'
]);

// By default the generator only CREATES pages that don't exist yet, so running
// it is always safe (it won't clobber hand-tuned live pages such as their
// community notes). Pass --force to overwrite everything from the template.
const FORCE = process.argv.includes('--force');

function page(opts) {
  const {
    title, format, sizes, defaultSize, bacMl, calcDose, calcUnit, route, mode,
    sprayMl, storageKey, mechanism, bullets, dosingIntro, tables, safety, warnings,
    extraHtml, sizeUnit
  } = opts;

  const pickerAttrs = [
    'id="vial-picker"',
    `data-storage-key="${storageKey}"`,
    `data-sizes="${sizes.join(',')}"`,
    `data-default="${defaultSize}"`,
    bacMl != null ? `data-bac-ml="${bacMl}"` : '',
    sprayMl != null ? `data-spray-ml="${sprayMl}"` : '',
    `data-calc-dose="${calcDose}"`,
    `data-calc-unit="${calcUnit}"`,
    `data-route="${route}"`,
    `data-mode="${mode || 'subq'}"`,
    sizeUnit ? `data-size-unit="${sizeUnit}"` : ''
  ].filter(Boolean).join('\n         ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <script src="../global-nav.js?v=${NAV_VER}"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} Protocol</title>
</head>
<body>

    <h1>${title}</h1>
    <p><strong>Format:</strong> ${format} · Vial <span data-vial-mg>${defaultSize} ${sizeUnit || 'mg'}</span></p>

    <hr>

    <h3>🧬 Mechanism of Action</h3>
    <p>${mechanism}</p>
    <ul>
${bullets.map((b) => `        <li>${b}</li>`).join('\n')}
    </ul>

    <hr>

    <h3>🧪 Reconstitution Guide</h3>
    <div ${pickerAttrs}></div>
    <div class="route-stack">
${tables.recon}
    </div>

    <hr>

    <h3>📅 Protocol &amp; Dosing</h3>
${dosingIntro}
    <div class="route-stack">
${tables.dose}
    </div>

    <hr>

    <h3>⚠️ Safety &amp; Side Effects</h3>
    <ul>
${safety.map((s) => `        <li>${s}</li>`).join('\n')}
    </ul>

    <blockquote>
        <p><strong>CRITICAL WARNINGS:</strong></p>
        <ul>
${warnings.map((w) => `            <li>${w}</li>`).join('\n')}
            <li><strong>For laboratory research use only.</strong></li>
        </ul>
    </blockquote>
${extraHtml || ''}
    <script src="../js/vial-size.js?v=${VIAL_VER}"></script>
</body>
</html>
`;
}

// Lightweight template for ready-to-use / non-mg-dosed products (premixed mL
// cocktails, IU- or mcg-based vials, topical cosmetics, diluents). These skip
// the milligram-based vial calculator, which only makes sense for mg peptides.
function simplePage(opts) {
  const {
    title, format, mechanism, bullets,
    usageHeading = '📅 Usage & Handling', usage,
    safety, warnings
  } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <script src="../global-nav.js?v=${NAV_VER}"></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} Protocol</title>
</head>
<body>

    <h1>${title}</h1>
    <p><strong>Format:</strong> ${format}</p>

    <hr>

    <h3>🧬 Overview</h3>
    <p>${mechanism}</p>
    <ul>
${bullets.map((b) => `        <li>${b}</li>`).join('\n')}
    </ul>

    <hr>

    <h3>${usageHeading}</h3>
    <div class="route-stack">
        <section class="route-panel route-subq">
            <p class="route-label">Guide</p>
            <ul>
${usage.map((u) => `                <li>${u}</li>`).join('\n')}
            </ul>
        </section>
    </div>

    <hr>

    <h3>⚠️ Safety &amp; Side Effects</h3>
    <ul>
${safety.map((s) => `        <li>${s}</li>`).join('\n')}
    </ul>

    <blockquote>
        <p><strong>CRITICAL WARNINGS:</strong></p>
        <ul>
${warnings.map((w) => `            <li>${w}</li>`).join('\n')}
            <li><strong>For laboratory research use only.</strong></li>
        </ul>
    </blockquote>

</body>
</html>
`;
}

function subqRecon(label = 'Subcutaneous reconstitution', note = '') {
  return `        <section class="route-panel route-subq">
            <p class="route-label">Sub-Q</p>
            <h4>${label}</h4>
            <ul>
                <li><strong>Diluent:</strong> Add <strong data-vial-bac></strong> of Bacteriostatic (BAC) Water gently down the side of the vial. Use the BAC water chips above to compare mixes — dosing units update live.</li>
                <li><strong>Mixing:</strong> Do <em>not</em> shake. Swirl gently until the solution is completely clear.</li>
                <li><strong>Final Concentration:</strong> <span data-vial-conc></span>.</li>
                <li><strong>Storage:</strong> Store in refrigerator at <strong>36°F–46°F</strong> (2°C–8°C).</li>
            </ul>
            ${note}
        </section>`;
}

function nasalRecon(extra = '') {
  return `        <section class="route-panel route-nasal">
            <p class="route-label">Nasal</p>
            <h4>Nasal spray reconstitution</h4>
            <p>Use <em>sterile water</em> or <em>normal saline</em> — not BAC. Metered pump ≈ 0.1 mL/spray. Finished spray volume <strong>4.0 mL</strong>.</p>
            <ol>
                <li>Reconstitute the vial with ~half the water; swirl gently.</li>
                <li>Transfer into a spray bottle and bring total finished volume to <strong>4.0 mL</strong>.</li>
                <li><strong>Final:</strong> <span data-vial-conc></span>.</li>
                <li>Refrigerate; discard if cloudy or after ~30 days.</li>
            </ol>
            ${extra}
        </section>`;
}

function doseTable(rows, heading = 'Subcutaneous dosing', route = 'subq', volHeader = 'Syringe Volume (U-100)') {
  const body = rows.map((r) => {
    let units = '';
    if (r.mcg != null && r.mcgHigh != null) units = `data-units data-dose-mcg="${r.mcg}" data-dose-mcg-high="${r.mcgHigh}"`;
    else if (r.mcg != null) units = `data-units data-dose-mcg="${r.mcg}"`;
    else if (r.mgHigh != null) units = `data-units data-dose-mg="${r.mg}" data-dose-mg-high="${r.mgHigh}"`;
    else units = `data-units data-dose-mg="${r.mg}"`;
    return `                    <tr><td><strong>${r.tier}</strong></td><td>${r.doseLabel}</td><td ${units}></td></tr>`;
  }).join('\n');
  return `        <section class="route-panel route-${route}">
            <p class="route-label">${route === 'nasal' ? 'Nasal' : 'Sub-Q'}</p>
            <h4>${heading}</h4>
            <table>
                <thead>
                    <tr>
                        <th>Tier</th>
                        <th>Target Dose</th>
                        <th>${volHeader}</th>
                    </tr>
                </thead>
                <tbody>
${body}
                </tbody>
            </table>
        </section>`;
}

function redirect(to, vial) {
  const url = vial != null ? `${to}?vial=${vial}` : to;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0; url=${url}">
    <title>Redirecting…</title>
    <script>location.replace('${url}');</script>
</head>
<body>
    <p>This page moved to <a href="${url}">${url}</a>.</p>
</body>
</html>
`;
}

function write(name, html) {
  if (EXCLUSIONS.has(name)) {
    console.log('skip (excluded):', name);
    return;
  }
  const dest = path.join(dir, name);
  const existed = fs.existsSync(dest);
  if (existed && !FORCE) {
    console.log('skip (exists):', name);
    return;
  }
  fs.writeFileSync(dest, html);
  console.log((existed ? 'overwrote' : 'created') + ':', name);
}

const files = {};

files['bpc-157.html'] = page({
  title: 'BPC-157',
  format: 'Lyophilized Powder (Body Protection Compound-157)',
  sizes: [5, 10, 20], defaultSize: 5, bacMl: 2, calcDose: 375, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.bpc-157',
  mechanism: 'A synthetic peptide sequence derived from a protective protein found in gastric juice, studied for angiogenic and tissue-healing signaling.',
  bullets: [
    'Supports growth-factor signaling involved in tendon, ligament, and muscle repair models.',
    'Associated with fibroblast migration and collagen synthesis at injury sites in preclinical work.',
    'Often discussed for systemic anti-inflammatory and mucosal support effects.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Subcutaneous injection 1–2× daily. Timing relative to food is flexible.</p><p><strong>Targeting:</strong> Systemic belly-fat injections are common; some protocols prefer near a localized injury site.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '250 mcg', mcg: 250 },
      { tier: 'Standard / Moderate', doseLabel: '375 mcg', mcg: 375 },
      { tier: 'Aggressive / Acute Injury', doseLabel: '500 mcg', mcg: 500 }
    ])
  },
  safety: ['<strong>Common:</strong> Generally well tolerated. Mild injection-site redness, transient dizziness, or mild digestive changes.'],
  warnings: ['Discontinue if unusual localized swelling or unmanageable joint irritation occurs.', 'Typically run in cycles of 4–12 weeks followed by a rest period.']
});
files['bpc-157-5mg.html'] = redirect('bpc-157.html', 5);

files['tesamorelin.html'] = page({
  title: 'Tesamorelin',
  format: 'Lyophilized Powder (GHRH analogue)',
  sizes: [5, 10], defaultSize: 10, bacMl: 2, calcDose: 2, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.tesamorelin',
  mechanism: 'A stabilized analogue of growth hormone–releasing hormone (GHRH 1–44). It binds pituitary GHRH receptors to stimulate endogenous GH release in a pulsatile pattern.',
  bullets: [
    'Increases IGF-1 secondary to elevated GH output.',
    'Favors reduction of visceral adipose tissue while supporting lean-mass retention.',
    'Does not permanently suppress the pituitary feedback loop the way exogenous GH can.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once daily Sub-Q at bedtime on an empty stomach (or at least 90 minutes after the last meal). Common schedule: <strong>5 days on, 2 days off</strong>.</p><p><strong>Cycle length:</strong> Often planned around a ~10–20 week run, then reassess.</p>',
  tables: {
    recon: subqRecon('Subcutaneous reconstitution', '<p class="hint">Use <strong>2.0 mL</strong> BAC water per <strong>10 mg</strong> vial — under 2 mL the solution can gel up.</p>'),
    dose: doseTable([
      { tier: 'Conservative / Start', doseLabel: '1.0 mg', mg: 1 },
      { tier: 'Standard', doseLabel: '1.5 mg', mg: 1.5 },
      { tier: 'Full / Clinical-style', doseLabel: '2.0 mg', mg: 2 }
    ])
  },
  safety: ['<strong>Common:</strong> Injection-site redness or itching, transient flushing, joint stiffness, mild edema, tingling, IGF-1–related water retention.'],
  warnings: ['Monitor for edema, carpal-tunnel-like symptoms, and elevated IGF-1.', 'Not for use during active malignancy workups without clinical oversight.']
});
files['tesamorelin-10mg.html'] = redirect('tesamorelin.html', 10);

files['ghk-cu.html'] = page({
  title: 'GHK-Cu',
  format: 'Lyophilized Powder (Copper tripeptide-1)',
  sizes: [50, 100], defaultSize: 100, bacMl: 3, calcDose: 2, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.ghk-cu',
  mechanism: 'A naturally occurring copper-binding tripeptide involved in tissue remodeling and repair signaling.',
  bullets: [
    'Supports collagen / elastin synthesis and extracellular matrix remodeling.',
    'Exhibits antioxidant and anti-inflammatory activity via copper-dependent enzyme pathways.',
    'Studied for wound healing, skin quality, and hair-follicle support.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Subcutaneous injection once daily (or 5–6 days/week). Timing is flexible relative to meals.</p>',
  tables: {
    recon: subqRecon().replace('completely clear.', 'fully dissolved. A clear <strong>blue</strong> solution is normal (copper complex).'),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '1.0 mg', mg: 1 },
      { tier: 'Standard', doseLabel: '1.5–2.0 mg', mg: 1.5, mgHigh: 2 },
      { tier: 'Higher research range', doseLabel: '2.0–3.0 mg', mg: 2, mgHigh: 3 }
    ])
  },
  safety: ['<strong>Common:</strong> Blue tint at injection site (temporary), mild site irritation, metallic taste (rare), transient fatigue or flushing.'],
  warnings: ['Copper peptide — do not combine casually with high-dose copper supplements without reason.', 'Discontinue if persistent rash, hives, or systemic allergic signs appear.']
});
files['ghk-cu-100mg.html'] = redirect('ghk-cu.html', 100);

files['selank.html'] = page({
  title: 'Selank',
  format: 'Lyophilized Powder (tuftsin analogue)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, sprayMl: 4, calcDose: 250, calcUnit: 'mcg', route: 'nasal', mode: 'nasal',
  storageKey: 'vial.selank',
  mechanism: 'A synthetic heptapeptide analogue of the immunomodulatory peptide tuftsin, studied for anxiolytic and nootropic CNS effects.',
  bullets: [
    'Modulates cytokine signaling (including IL-6) and monoamine neurotransmitter activity.',
    'Anxiolytic / stress-resilience profile without classic sedation in its origin-country clinical literature.',
    'Associated with BDNF-related cognitive support under stress load.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Intranasal 1–2× daily. Often run in 10–14 day cycles or as-needed for high-stress periods.</p>',
  tables: {
    recon: nasalRecon(),
    dose: doseTable([
      { tier: 'Baseline / Standard', doseLabel: '250 mcg', mcg: 250 },
      { tier: 'Higher / Intensive', doseLabel: '500 mcg', mcg: 500 }
    ], 'Nasal dosing', 'nasal', 'Nasal sprays (0.1 mL)')
  },
  safety: ['<strong>Common:</strong> Mild nasal irritation, brief headache, or fatigue.'],
  warnings: ['Do not use BAC water for nasal mixes.', 'Stop if persistent nosebleeds, severe headache, or allergic signs occur.']
});
files['selank-5mg.html'] = redirect('selank.html', 5);

files['pt-141.html'] = page({
  title: 'PT-141',
  format: 'Lyophilized Powder (Bremelanotide)',
  sizes: [10], defaultSize: 10, bacMl: 3, sprayMl: 4, calcDose: 1, calcUnit: 'mg', route: 'nasal', mode: 'nasal',
  storageKey: 'vial.pt-141',
  mechanism: 'Synthetic alpha-MSH analogue acting as a melanocortin receptor agonist (notably MC3R/MC4R) in the central nervous system.',
  bullets: [
    'Acts centrally rather than primarily through vascular pathways.',
    'Studied for libido and sexual-function signaling via melanocortin / dopamine pathways.'
  ],
  dosingIntro: '<p><strong>General rules:</strong> PRN, roughly 45 minutes to 6 hours before activity. Max about 8 doses/month; do not repeat within 24 hours. Start low — nausea is common.</p>',
  tables: {
    recon: `${nasalRecon()}
        <section class="route-panel route-subq">
            <p class="route-label">Sub-Q</p>
            <h4>Optional subcutaneous mix</h4>
            <ul>
                <li>Add <strong>3.0 mL</strong> BAC water to the vial for injection use.</li>
                <li>At 10 mg / 3 mL: ≈3.33 mg/mL (1 mg ≈ 30 units).</li>
            </ul>
        </section>`,
    dose: doseTable([
      { tier: 'Low / Test', doseLabel: '0.5 mg (500 mcg)', mcg: 500 },
      { tier: 'Standard', doseLabel: '1.0 mg', mg: 1 },
      { tier: 'Moderate–High', doseLabel: '1.5–2.0 mg', mg: 1.5, mgHigh: 2 }
    ], 'Nasal dosing', 'nasal', 'Sprays (0.1 mL)')
  },
  safety: ['<strong>Common:</strong> Nausea, flushing, headache, yawning, spontaneous erections, injection/nasal irritation.'],
  warnings: ['Do not stack casually with other melanocortin agonists (e.g. Melanotan II).', 'Seek care for severe/prolonged nausea, chest pain, or hypertensive symptoms.']
});
files['pt-141-10mg.html'] = redirect('pt-141.html', 10);

// Metabolic
files['tirzepatide.html'] = page({
  title: 'Tirzepatide',
  format: 'Lyophilized Powder (dual GIP/GLP-1 receptor agonist)',
  sizes: [10, 15, 20, 30, 40, 50, 60], defaultSize: 30, bacMl: 3, calcDose: 2.5, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.tirzepatide',
  mechanism: 'Dual agonist of glucose-dependent insulinotropic polypeptide (GIP) and glucagon-like peptide-1 (GLP-1) receptors.',
  bullets: [
    'Enhances glucose-dependent insulin secretion and slows gastric emptying.',
    'Strong appetite suppression and body-weight reduction signal in clinical literature.',
    'Weekly Sub-Q cadence in branded and research protocols.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once weekly Sub-Q. Titrate slowly (often every 4 weeks) based on tolerance.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Start', doseLabel: '2.5 mg', mg: 2.5 },
      { tier: 'Step 2', doseLabel: '5.0 mg', mg: 5 },
      { tier: 'Step 3', doseLabel: '7.5 mg', mg: 7.5 },
      { tier: 'Step 4', doseLabel: '10 mg', mg: 10 },
      { tier: 'Higher steps', doseLabel: '12.5–15 mg', mg: 12.5, mgHigh: 15 }
    ], 'Common weekly titration anchors')
  },
  safety: ['<strong>Common:</strong> Nausea, vomiting, diarrhea, constipation, decreased appetite, fatigue, injection-site reactions.'],
  warnings: ['Discontinue and seek care for severe abdominal pain (possible pancreatitis signal).', 'Monitor for gallbladder symptoms and significant GI intolerance.']
});

files['semaglutide.html'] = page({
  title: 'Semaglutide',
  format: 'Lyophilized Powder (GLP-1 receptor agonist)',
  sizes: [10, 20, 30], defaultSize: 10, bacMl: 2, calcDose: 0.25, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.semaglutide',
  mechanism: 'Long-acting GLP-1 receptor agonist that augments glucose-dependent insulin release, suppresses glucagon, and slows gastric emptying.',
  bullets: [
    'Weekly Sub-Q metabolic / body-composition protocols are common in research settings.',
    'Strong appetite suppression and glycemic effects in clinical literature.',
    'Titrate slowly to limit GI side effects.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once weekly Sub-Q. Increase only after several tolerated doses at the current step.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Start', doseLabel: '0.25 mg', mg: 0.25 },
      { tier: 'Step 2', doseLabel: '0.5 mg', mg: 0.5 },
      { tier: 'Step 3', doseLabel: '1.0 mg', mg: 1 },
      { tier: 'Higher research range', doseLabel: '1.7–2.4 mg', mg: 1.7, mgHigh: 2.4 }
    ], 'Common weekly titration anchors')
  },
  safety: ['<strong>Common:</strong> Nausea, vomiting, diarrhea, constipation, abdominal discomfort, fatigue.'],
  warnings: ['Stop for severe abdominal pain or suspected pancreatitis.', 'Use caution with a history of medullary thyroid carcinoma / MEN2 in clinical contexts.']
});

files['cagrilintide.html'] = page({
  title: 'Cagrilintide',
  format: 'Lyophilized Powder (long-acting amylin analogue)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 0.6, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.cagrilintide',
  mechanism: 'Long-acting amylin receptor agonist studied for appetite regulation and complementary metabolic effects alongside incretin agonists.',
  bullets: [
    'Amylin signaling contributes to satiety and delayed gastric emptying.',
    'Often discussed in research stacks with GLP-1 / dual agonists (not as a casual DIY mix).',
    'Weekly Sub-Q cadence in published titration schemes.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Typically once weekly Sub-Q in published protocols. Titrate slowly.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Start', doseLabel: '0.3–0.6 mg', mg: 0.3, mgHigh: 0.6 },
      { tier: 'Mid', doseLabel: '1.2–2.4 mg', mg: 1.2, mgHigh: 2.4 },
      { tier: 'Higher research range', doseLabel: '4.5 mg', mg: 4.5 }
    ])
  },
  safety: ['<strong>Common:</strong> Nausea, decreased appetite, GI discomfort, injection-site reactions.'],
  warnings: ['Do not aggressively stack with other strong GI-delaying agents without understanding additive nausea risk.']
});

// Repair / GH
files['tb-500.html'] = page({
  title: 'TB-500',
  format: 'Lyophilized Powder (Thymosin Beta-4 fragment / analogue)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 2, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.tb-500',
  mechanism: 'Synthetic peptide related to thymosin beta-4, studied for actin regulation, cell migration, and tissue-repair signaling.',
  bullets: [
    'Often paired with BPC-157 in community “Wolverine” repair stacks.',
    'Discussed for systemic recovery rather than purely local injection.',
    'Loading then lower maintenance schedules are common in research discussions.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Common pattern is 2× weekly during a loading phase, then less frequent maintenance. Timing is flexible.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '2.0 mg', mg: 2 },
      { tier: 'Standard load', doseLabel: '2.5–5.0 mg', mg: 2.5, mgHigh: 5 },
      { tier: 'Higher research range', doseLabel: '5.0–10 mg', mg: 5, mgHigh: 10 }
    ])
  },
  safety: ['<strong>Common:</strong> Transient fatigue, head rush, mild injection-site irritation.'],
  warnings: ['Avoid casual use around active cancer workups.', 'Cycle length is typically finite (weeks), not indefinite daily use.']
});

files['bpc-157-tb-500.html'] = page({
  title: 'BPC-157 + TB-500',
  format: 'Lyophilized blend (repair stack)',
  sizes: [10, 20], defaultSize: 10, bacMl: 2, calcDose: 250, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.bpc-tb',
  mechanism: 'Combined BPC-157 and TB-500 vial marketed for complementary tissue-repair research themes (local repair signaling + systemic actin/migration support).',
  bullets: [
    '10 mg blend = typically 5 mg BPC-157 + 5 mg TB-500.',
    '20 mg blend = typically 10 mg BPC-157 + 10 mg TB-500.',
    'Doses below treat the draw as total peptide mass; split intent is informational.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Often 1–2× daily for the BPC component intent, with TB-oriented weekly load thinking in the background. Confirm label ratios on your vial.</p>',
  tables: {
    recon: subqRecon('Blend reconstitution'),
    dose: doseTable([
      { tier: 'Conservative total draw', doseLabel: '250 mcg total', mcg: 250 },
      { tier: 'Standard total draw', doseLabel: '500 mcg total', mcg: 500 },
      { tier: 'Higher total draw', doseLabel: '1.0 mg total', mg: 1 }
    ])
  },
  safety: ['<strong>Common:</strong> Mild site irritation, transient dizziness or fatigue.'],
  warnings: ['Verify the printed BPC:TB ratio on the vial label.', 'Same malignancy-caution notes as standalone repair peptides.']
});

files['glow.html'] = page({
  title: 'GLOW',
  format: 'Lyophilized 3-peptide blend (GHK-Cu + BPC-157 + TB-500)',
  sizes: [70], defaultSize: 70, bacMl: 2, calcDose: 3.5, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.glow',
  mechanism: 'Community “GLOW” repair/skin blend: copper-tripeptide GHK-Cu plus the BPC-157 / TB-500 repair pair in one vial (no KPV — that is <a href="klow.html">KLOW</a>).',
  bullets: [
    'Typical vial: <strong>70 mg</strong> total = <strong>50 mg GHK-Cu</strong> + <strong>10 mg BPC-157</strong> + <strong>10 mg TB-500</strong> (5:1:1).',
    'GHK-Cu is discussed for collagen / remodeling themes; BPC and TB for soft-tissue repair and cell-migration research.',
    'Dose rows use <em>total blend mass</em>. At 2 mL BAC, ~10 units ≈ 3.5 mg total → ~2.5 mg GHK-Cu + ~0.5 mg BPC + ~0.5 mg TB.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once daily Sub-Q is the usual community pattern (some run 5 on / 2 off). Cycles often 8–12 weeks with a break — watch copper load from the GHK-Cu majority.</p><p>Confirm the printed ratio on your label; vendor blends can differ.</p>',
  tables: {
    recon: subqRecon('GLOW blend reconstitution'),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '1.75 mg total (~5 units @ 2 mL)', mg: 1.75 },
      { tier: 'Standard', doseLabel: '3.5 mg total (~10 units @ 2 mL)', mg: 3.5 },
      { tier: 'Higher', doseLabel: '7.0 mg total (~20 units @ 2 mL)', mg: 7 }
    ])
  },
  safety: ['<strong>Common:</strong> Injection-site irritation (copper peptides can sting), flushing, transient fatigue or headache.'],
  warnings: ['Verify GHK:BPC:TB amounts on the vial — not all “GLOW” SKUs match 50/10/10.', 'Same malignancy-caution notes as standalone repair peptides; copper accumulation is a reason to cycle off.', 'Do not confuse with <a href="klow.html">KLOW</a> (adds KPV).']
});

files['klow.html'] = page({
  title: 'KLOW',
  format: 'Lyophilized 4-peptide blend (GHK-Cu + KPV + BPC-157 + TB-500)',
  sizes: [80], defaultSize: 80, bacMl: 2, calcDose: 4, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.klow',
  mechanism: 'Community “KLOW” blend = <a href="glow.html">GLOW</a> (GHK-Cu + BPC-157 + TB-500) plus <strong>KPV</strong> for an extra anti-inflammatory (NF-κB–related) research angle in one draw.',
  bullets: [
    'Typical vial: <strong>80 mg</strong> total = <strong>50 mg GHK-Cu</strong> + <strong>10 mg KPV</strong> + <strong>10 mg BPC-157</strong> + <strong>10 mg TB-500</strong> (5:1:1:1).',
    'Same repair/remodeling stack as GLOW; KPV is the differentiator for inflammation-focused protocols.',
    'Dose rows use <em>total blend mass</em>. At 2 mL BAC, ~10 units ≈ 4 mg total → ~2.5 mg GHK-Cu + ~0.5 mg each of KPV, BPC, and TB.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once daily Sub-Q is common (some load 5×/week then step down). Cycles often 8–12 weeks on, then several weeks off for copper clearance.</p><p>Confirm the printed 50/10/10/10 split on your label.</p>',
  tables: {
    recon: subqRecon('KLOW blend reconstitution'),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '2.0 mg total (~5 units @ 2 mL)', mg: 2 },
      { tier: 'Standard', doseLabel: '4.0 mg total (~10 units @ 2 mL)', mg: 4 },
      { tier: 'Higher', doseLabel: '8.0 mg total (~20 units @ 2 mL)', mg: 8 }
    ])
  },
  safety: ['<strong>Common:</strong> Site sting/irritation from GHK-Cu, mild fatigue, headache; KPV is sometimes reported to soften site reactions vs GLOW alone.'],
  warnings: ['Verify all four printed amounts — marketing names vary.', 'Cycle off periodically; copper load tracks the GHK-Cu majority.', 'Same malignancy-caution notes as standalone repair peptides.']
});

files['ipamorelin.html'] = page({
  title: 'Ipamorelin',
  format: 'Lyophilized Powder (selective GH secretagogue / GHRP analogue)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 200, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.ipamorelin',
  mechanism: 'Ghrelin-mimetic GH secretagogue with a relatively selective GH-release profile and lower cortisol/prolactin signal than older GHRPs in many discussions.',
  bullets: [
    'Pulsatile GH release when dosed away from food.',
    'Often stacked with CJC-1295 No DAC / Mod GRF 1-29.',
    'Common bedtime and/or morning empty-stomach dosing.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> 1–3× daily Sub-Q on an empty stomach (or ≥60–90 minutes after food). Many use 5 on / 2 off.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '100 mcg', mcg: 100 },
      { tier: 'Standard', doseLabel: '200–300 mcg', mcg: 200, mcgHigh: 300 },
      { tier: 'Higher', doseLabel: '300–500 mcg', mcg: 300, mcgHigh: 500 }
    ])
  },
  safety: ['<strong>Common:</strong> Head rush, flushing, water retention, tingling, increased hunger.'],
  warnings: ['Avoid dosing near carbs/food if maximizing GH pulse is the goal.', 'Monitor for edema or carpal-tunnel-like symptoms with prolonged use.']
});

files['cjc-1295-no-dac.html'] = page({
  title: 'CJC-1295 No DAC',
  format: 'Lyophilized Powder (Mod GRF 1-29 / GHRH analogue without Drug Affinity Complex)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 100, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.cjc-no-dac',
  mechanism: 'Short-acting GHRH analogue (often called Mod GRF 1-29) that amplifies GH pulses, especially when paired with a GHRP such as Ipamorelin.',
  bullets: [
    'No DAC → shorter half-life and multiple daily pulses rather than a flat elevation.',
    'Classic stack partner with Ipamorelin.',
    'Best away from food for pulse quality.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> 1–3× daily Sub-Q, commonly with Ipamorelin, 5 on / 2 off.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '50–100 mcg', mcg: 50, mcgHigh: 100 },
      { tier: 'Standard', doseLabel: '100 mcg', mcg: 100 },
      { tier: 'Higher', doseLabel: '100–200 mcg', mcg: 100, mcgHigh: 200 }
    ])
  },
  safety: ['<strong>Common:</strong> Flushing, head rush, water retention, vivid dreams, injection-site irritation.'],
  warnings: ['Do not confuse with CJC-1295 with DAC (different schedule).', 'Same GH-axis edema / IGF-1 monitoring cautions.']
});

files['cjc-1295-dac.html'] = page({
  title: 'CJC-1295 with DAC',
  format: 'Lyophilized Powder (GHRH analogue with Drug Affinity Complex)',
  sizes: [5], defaultSize: 5, bacMl: 2, calcDose: 2, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.cjc-dac',
  mechanism: 'Long-acting GHRH analogue bound to albumin via DAC, producing a more prolonged GH/IGF-1 elevation than No-DAC Mod GRF.',
  bullets: [
    'Infrequent dosing (often 1–2× weekly) versus multi-daily No DAC.',
    'Less “pulse-like” GH pattern than No DAC + Ipamorelin stacks.',
    'Different risk/benefit profile — not interchangeable with No DAC schedules.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Commonly 1–2× weekly Sub-Q in research discussions.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '1.0 mg', mg: 1 },
      { tier: 'Standard', doseLabel: '2.0 mg', mg: 2 }
    ])
  },
  safety: ['<strong>Common:</strong> Water retention, joint stiffness, flushing, fatigue, injection-site reactions.'],
  warnings: ['Not the same protocol as CJC-1295 No DAC.', 'Monitor IGF-1-related side effects carefully with long-acting GH axis agents.']
});

// Longevity / CNS
files['epitalon.html'] = page({
  title: 'Epitalon',
  format: 'Lyophilized Powder (Epithalon / Ala-Glu-Asp-Gly)',
  sizes: [10, 50], defaultSize: 10, bacMl: 2, calcDose: 5, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.epitalon',
  mechanism: 'Synthetic tetrapeptide studied in aging and pineal/telomerase-related research models (also called Epithalon / Epithalone).',
  bullets: [
    'Discussed for circadian / pineal signaling and cellular aging research themes.',
    'Often run in short courses rather than indefinite daily use.',
    'Sub-Q is the common research route on protocol sheets.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Daily Sub-Q during a limited course (often ~10–20 days), then off.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Common course dose', doseLabel: '5–10 mg', mg: 5, mgHigh: 10 }
    ])
  },
  safety: ['<strong>Common:</strong> Mild injection-site irritation; otherwise often described as quiet.'],
  warnings: ['Evidence base is mixed and largely non-US clinical; treat as research-only.', 'Do not assume “anti-aging” outcomes from marketing claims.']
});

files['mots-c.html'] = page({
  title: 'MOTS-c',
  format: 'Lyophilized Powder (mitochondrial-derived peptide)',
  sizes: [10, 40], defaultSize: 10, bacMl: 1, calcDose: 5, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.mots-c',
  mechanism: 'Mitochondrial open reading frame peptide studied for metabolic flexibility, exercise-mimetic signaling, and insulin-sensitivity research.',
  bullets: [
    'Discussed for metabolic and body-composition research contexts.',
    'Often dosed a few times per week rather than daily.',
    'Sub-Q is the typical sheet route.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Commonly 2–3× weekly Sub-Q in community research protocols.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '5 mg', mg: 5 },
      { tier: 'Standard', doseLabel: '10 mg', mg: 10 },
      { tier: 'Higher research range', doseLabel: '15 mg', mg: 15 }
    ])
  },
  safety: ['<strong>Common:</strong> Flushing, temporary fatigue or stimulation, injection-site irritation.'],
  warnings: ['Metabolic peptide — watch for unexpected glucose swings if stacked with incretins.', 'Research-only; human outcome data remain limited.']
});

files['nad.html'] = page({
  title: 'NAD+',
  format: 'Lyophilized Powder (nicotinamide adenine dinucleotide)',
  sizes: [100, 500, 1000], defaultSize: 500, bacMl: 5, calcDose: 50, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.nad',
  mechanism: 'Essential redox cofactor involved in cellular energy metabolism and sirtuin-related signaling; injectable NAD+ is used in wellness/research settings.',
  bullets: [
    'Sub-Q or IM micro-dosing appears in community protocols; IV clinic protocols differ.',
    'Flushing and chest pressure can occur if pushed too quickly.',
    'Large vials are common because per-session milligram amounts add up.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Highly variable (e.g. several times weekly). Start low and inject slowly.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Low / test', doseLabel: '25–50 mg', mg: 25, mgHigh: 50 },
      { tier: 'Common research range', doseLabel: '50–100 mg', mg: 50, mgHigh: 100 },
      { tier: 'Higher session', doseLabel: '100–200 mg', mg: 100, mgHigh: 200 }
    ])
  },
  safety: ['<strong>Common:</strong> Flushing, warmth, chest tightness, nausea, cramping if administered too fast.'],
  warnings: ['Inject slowly; stop if significant chest pressure or distress occurs.', 'Not interchangeable with oral NR/NMN supplements.']
});

files['semax.html'] = page({
  title: 'Semax',
  format: 'Lyophilized Powder (ACTH 4–10 analogue)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, sprayMl: 4, calcDose: 300, calcUnit: 'mcg', route: 'nasal', mode: 'nasal',
  storageKey: 'vial.semax',
  mechanism: 'Synthetic ACTH fragment analogue studied for nootropic, neuroprotective, and BDNF-related CNS effects; commonly used intranasally.',
  bullets: [
    'Often paired conceptually with Selank (focus vs calm), though they are distinct peptides.',
    'Nasal delivery is the default on this sheet.',
    'Short courses or as-needed cognitive-demand use are common.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Intranasal 1–2× daily during focused work blocks or short cycles.</p>',
  tables: {
    recon: nasalRecon(),
    dose: doseTable([
      { tier: 'Standard', doseLabel: '200–300 mcg', mcg: 200, mcgHigh: 300 },
      { tier: 'Higher', doseLabel: '300–600 mcg', mcg: 300, mcgHigh: 600 }
    ], 'Nasal dosing', 'nasal', 'Nasal sprays (0.1 mL)')
  },
  safety: ['<strong>Common:</strong> Nasal irritation, mild stimulation, headache, vivid dreams.'],
  warnings: ['Use sterile water/saline — not BAC — for nasal mixes.', 'Reduce dose if anxiety or overstimulation appears.']
});

files['kpv.html'] = page({
  title: 'KPV',
  format: 'Lyophilized Powder (alpha-MSH fragment tripeptide)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 500, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.kpv',
  mechanism: 'Anti-inflammatory tripeptide fragment of alpha-MSH studied for gut barrier and inflammatory-pathway research (including NF-κB-related signaling).',
  bullets: [
    'Discussed for GI comfort / inflammatory research themes.',
    'Sub-Q is common on protocol sheets; oral research uses exist separately.',
    'Often stacked in community <a href="glow.html">GLOW</a> / <a href="klow.html">KLOW</a> blends with GHK/BPC/TB.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> 1–2× daily Sub-Q is a common research-sheet pattern.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '200–500 mcg', mcg: 200, mcgHigh: 500 },
      { tier: 'Standard', doseLabel: '500 mcg', mcg: 500 },
      { tier: 'Higher', doseLabel: '500–1000 mcg', mcg: 500, mcgHigh: 1000 }
    ])
  },
  safety: ['<strong>Common:</strong> Mild injection-site irritation; otherwise often quiet.'],
  warnings: ['Not a substitute for medical care of IBD or infection.', 'Discontinue if rash or systemic allergic signs appear.']
});

files['melanotan-2.html'] = page({
  title: 'Melanotan II',
  format: 'Lyophilized Powder (MT-2 / alpha-MSH analogue)',
  sizes: [10], defaultSize: 10, bacMl: 2, calcDose: 250, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.mt2',
  mechanism: 'Non-selective melanocortin receptor agonist historically used in tanning and libido research contexts.',
  bullets: [
    'Stimulates melanogenesis (pigmentation) with UV exposure synergy.',
    'Can affect appetite and sexual function via melanocortin pathways.',
    'Nausea and flushing are very common on initiation.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Start low daily or every other day Sub-Q while assessing nausea; many reduce after a loading phase.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Test / start', doseLabel: '100–250 mcg', mcg: 100, mcgHigh: 250 },
      { tier: 'Common range', doseLabel: '250–500 mcg', mcg: 250, mcgHigh: 500 }
    ])
  },
  safety: ['<strong>Common:</strong> Nausea, flushing, facial/lip darkening, freckling, spontaneous erections, yawning, fatigue.'],
  warnings: ['Do not combine casually with PT-141 (overlapping melanocortin effects).', 'Monitor moles; seek dermatologic care for changing lesions.', 'Strong nausea risk — start low.']
});

files['dsip.html'] = page({
  title: 'DSIP',
  format: 'Lyophilized Powder (Delta Sleep-Inducing Peptide)',
  sizes: [5, 10, 15], defaultSize: 5, bacMl: 2, calcDose: 100, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.dsip',
  mechanism: 'Neuropeptide studied for sleep architecture and stress-modulation research.',
  bullets: [
    'Typically discussed for bedtime use.',
    'Effects are subtle and variable across users in anecdotal reports.',
    'Short courses are more common than indefinite nightly use.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Often Sub-Q in the evening / before bed, several nights per week or in short runs.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '100 mcg', mcg: 100 },
      { tier: 'Standard', doseLabel: '100–300 mcg', mcg: 100, mcgHigh: 300 }
    ])
  },
  safety: ['<strong>Common:</strong> Vivid dreams, next-day grogginess, mild headache, injection-site irritation.'],
  warnings: ['Do not combine casually with sedatives/alcohol.', 'Stop if paradoxical insomnia or mood changes worsen.']
});

files['thymosin-alpha-1.html'] = page({
  title: 'Thymosin Alpha-1',
  format: 'Lyophilized Powder (Ta1 / thymic peptide)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 1.6, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.ta1',
  mechanism: 'Thymic peptide studied for immune-modulation and T-cell related signaling.',
  bullets: [
    'Discussed in immune-support research contexts.',
    'Often dosed a few times weekly rather than daily.',
    'Distinct from TB-500 / thymosin beta-4.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Commonly 2× weekly Sub-Q in research-sheet patterns (protocols vary widely).</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Common research range', doseLabel: '1.6 mg', mg: 1.6 },
      { tier: 'Alternate', doseLabel: '0.8–1.6 mg', mg: 0.8, mgHigh: 1.6 }
    ])
  },
  safety: ['<strong>Common:</strong> Redness at injection site, transient fatigue or flu-like feelings.'],
  warnings: ['Immune-active peptide — use caution with autoimmune conditions unless guided clinically.', 'Not interchangeable with TB-500.']
});

files['5-amino-1mq.html'] = page({
  title: '5-Amino-1MQ',
  format: 'Lyophilized Powder (NNMT inhibitor, small molecule)',
  sizes: [5, 50], defaultSize: 50, bacMl: 2, calcDose: 2, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.5-amino-1mq',
  mechanism: 'A small-molecule inhibitor of nicotinamide N-methyltransferase (NNMT) studied for metabolic and fat-loss research. By slowing NNMT activity in adipose tissue it is investigated for effects on cellular NAD+/energy metabolism.',
  bullets: [
    'Researched for adipocyte metabolism, energy expenditure, and body-composition themes.',
    'Frequently studied as an oral compound; this sheet covers Sub-Q reconstitution like the other vials.',
    'Effects are gradual — evaluated over multi-week research runs rather than acutely.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Daily is a common research-sheet pattern; some protocols use several days per week. Timing relative to meals is flexible.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '1.0 mg', mg: 1 },
      { tier: 'Standard', doseLabel: '2.0 mg', mg: 2 },
      { tier: 'Higher research range', doseLabel: '2.0–3.5 mg', mg: 2, mgHigh: 3.5 }
    ])
  },
  safety: ['<strong>Common:</strong> Generally well tolerated in reports; occasional mild GI upset, headache, or injection-site irritation.'],
  warnings: ['Research compound — long-term human safety data is limited.', 'Introduce at a low dose and assess tolerance before increasing.']
});
files['5-amino-1mq-5mg.html'] = redirect('5-amino-1mq.html', 5);
files['5-amino-1mq-50mg.html'] = redirect('5-amino-1mq.html', 50);

// ---------------------------------------------------------------------------
// Catalogue expansion: one page per pricing-catalogue product.
// ---------------------------------------------------------------------------

files['ghrp-2.html'] = page({
  title: 'GHRP-2',
  format: 'Lyophilized Powder (Growth Hormone Releasing Peptide-2)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 100, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.ghrp-2',
  mechanism: 'A synthetic ghrelin-mimetic that binds the growth-hormone secretagogue receptor (GHS-R) to trigger a pulse of growth hormone from the pituitary. Frequently paired with a GHRH like CJC-1295 for a stronger, more natural pulse.',
  bullets: [
    'Stimulates a short GH pulse; usually dosed on an empty stomach.',
    'Synergizes with GHRH peptides (e.g. CJC-1295) in research stacks.',
    'Can transiently raise cortisol and prolactin more than Ipamorelin.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Often 1–3× daily (e.g. before bed and/or post-workout), away from food. ~100 mcg per pulse saturates the receptor in most protocols.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Standard pulse', doseLabel: '100 mcg', mcg: 100 },
      { tier: 'Per-dose range', doseLabel: '100–300 mcg', mcg: 100, mcgHigh: 300 }
    ])
  },
  safety: ['<strong>Common:</strong> Head/face flushing, water retention, tingling, and a temporary rise in hunger.', 'May raise cortisol and prolactin at higher doses.'],
  warnings: ['Avoid with active malignancy — GH secretagogues are not used in that setting.', 'Dosing above ~100 mcg per pulse rarely adds GH release but does raise side effects.']
});

files['ghrp-6.html'] = page({
  title: 'GHRP-6',
  format: 'Lyophilized Powder (Growth Hormone Releasing Peptide-6)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 100, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.ghrp-6',
  mechanism: 'A ghrelin-mimetic GHS-R agonist that triggers a growth-hormone pulse and strongly stimulates appetite — the most hunger-inducing of the common GHRPs.',
  bullets: [
    'Produces a GH pulse similar to GHRP-2 but with more pronounced appetite stimulation.',
    'Frequently stacked with a GHRH (CJC-1295) for a fuller pulse.',
    'Appetite spike can help bulking research or hinder a cut.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Often 1–3× daily on an empty stomach. ~100 mcg per pulse saturates the receptor in most protocols.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Standard pulse', doseLabel: '100 mcg', mcg: 100 },
      { tier: 'Per-dose range', doseLabel: '100–300 mcg', mcg: 100, mcgHigh: 300 }
    ])
  },
  safety: ['<strong>Common:</strong> Strong hunger within ~30 min, flushing, water retention, tingling.', 'Can raise cortisol and prolactin at higher doses.'],
  warnings: ['Avoid with active malignancy.', 'Marked appetite increase may be undesirable during fat-loss phases.']
});

files['pe-22-28.html'] = page({
  title: 'PE-22-28',
  format: 'Lyophilized Powder (spadin-derived TREK-1 inhibitor)',
  sizes: [10], defaultSize: 10, bacMl: 2, calcDose: 250, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.pe-22-28',
  mechanism: 'A seven–amino-acid peptide derived from spadin that selectively blocks the TREK-1 potassium channel. In rodent models this releases the brake on serotonergic firing and rapidly promotes neurogenesis, giving fast-acting antidepressant-like effects.',
  bullets: [
    'Selective TREK-1 (KCNK2) antagonist studied for rapid antidepressant activity.',
    'Preclinical only — all published dosing comes from mouse studies; no human dose exists.',
    'Research shows a biphasic response: very low doses can be neuroprotective, higher doses antidepressant.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> No validated human protocol exists. Research-sheet patterns use small daily microgram amounts; treat any dose as experimental.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Low (experimental)', doseLabel: '100 mcg', mcg: 100 },
      { tier: 'Research-sheet range', doseLabel: '100–500 mcg', mcg: 100, mcgHigh: 500 }
    ])
  },
  safety: ['<strong>Common:</strong> Human side-effect data does not exist; safety is unknown.'],
  warnings: ['No human safety, PK, or efficacy data — rodent research only.', 'Not FDA-approved and prohibited from compounding in the US.']
});

files['pinealon.html'] = page({
  title: 'Pinealon',
  format: 'Lyophilized Powder (EDR tripeptide bioregulator)',
  sizes: [5, 10, 20], defaultSize: 10, bacMl: 2, calcDose: 100, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.pinealon',
  mechanism: 'A short Glu-Asp-Arg (EDR) peptide from the Khavinson bioregulator family. It is proposed to cross into the cell nucleus and interact directly with gene promoter regions, modulating antioxidant and neuroprotective genes rather than acting on a surface receptor.',
  bullets: [
    'Studied for neuroprotection, cognition, and antioxidant defense in aging models.',
    'Typically run as short 10–20 day courses, repeated a few times a year.',
    'Part of the peptide-bioregulator class alongside Epitalon.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Commonly once daily for a 10–20 day course. Research doses cluster in the low-microgram-per-day range.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative', doseLabel: '100 mcg', mcg: 100 },
      { tier: 'Research range', doseLabel: '100–300 mcg', mcg: 100, mcgHigh: 300 }
    ])
  },
  safety: ['<strong>Common:</strong> Reported as well tolerated; occasional injection-site irritation.'],
  warnings: ['No standardized human dosing has been established.', 'Bioregulator research is early-stage; treat as experimental.']
});

files['pnc-27.html'] = page({
  title: 'PNC-27',
  format: 'Lyophilized Powder (p53-derived anticancer research peptide)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 250, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.pnc-27',
  mechanism: 'A chimeric peptide combining a p53 fragment (residues 12–26) with a membrane-penetrating leader. It binds HDM-2 that is uniquely expressed on cancer-cell membranes and forms transmembrane pores, causing selective necrosis of tumor cells while sparing normal cells that lack membrane HDM-2.',
  bullets: [
    'Targets membrane-bound HDM-2 to induce pore formation and cancer-cell necrosis in vitro.',
    'Strictly preclinical — no human clinical trials have been conducted.',
    'Reported to spare normal cells in laboratory models.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> No validated human protocol exists. Published research uses cell-culture concentrations and animal mg/kg dosing; any human use is unstudied.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Research-sheet range', doseLabel: '100–250 mcg', mcg: 100, mcgHigh: 250 }
    ])
  },
  safety: ['<strong>Common:</strong> No human safety data exists.'],
  warnings: ['Preclinical anticancer research peptide — no human trials, PK, or safety data.', 'Not a treatment for any disease.']
});

files['mgf.html'] = page({
  title: 'MGF',
  format: 'Lyophilized Powder (Mechano Growth Factor, IGF-1Ec splice variant)',
  sizes: [2], defaultSize: 2, bacMl: 1, calcDose: 200, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.mgf',
  mechanism: 'A splice variant of IGF-1 (IGF-1Ec) released by muscle in response to mechanical overload. It is studied for activating muscle satellite (stem) cells and supporting local tissue repair after training-induced damage.',
  bullets: [
    'Investigated for satellite-cell activation and localized muscle repair.',
    'Short-acting — often injected locally post-workout in research protocols.',
    'The pegylated form (PEG-MGF) extends its very short half-life for systemic use.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Research-sheet patterns use post-workout dosing on training days, often injected near the worked muscle. Half-life is very short.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Standard', doseLabel: '200 mcg', mcg: 200 },
      { tier: 'Research range', doseLabel: '100–200 mcg', mcg: 100, mcgHigh: 200 }
    ])
  },
  safety: ['<strong>Common:</strong> Injection-site irritation; generally well tolerated at these doses.'],
  warnings: ['Growth-factor peptides are avoided with active malignancy.', 'Very short half-life — timing matters in research protocols.']
});

files['peg-mgf.html'] = page({
  title: 'PEG-MGF',
  format: 'Lyophilized Powder (Pegylated Mechano Growth Factor)',
  sizes: [2], defaultSize: 2, bacMl: 1, calcDose: 200, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.peg-mgf',
  mechanism: 'Mechano Growth Factor with a polyethylene-glycol (PEG) tag that greatly extends its half-life, allowing a systemic rather than purely local effect. Studied for satellite-cell activation and muscle repair.',
  bullets: [
    'Pegylation extends MGF’s half-life from minutes to a much longer window.',
    'Typically dosed a few times per week rather than every session.',
    'Investigated for recovery and muscle repair support.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Research-sheet patterns use ~2–3× weekly Sub-Q, taking advantage of the extended half-life.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Standard', doseLabel: '200 mcg', mcg: 200 },
      { tier: 'Research range', doseLabel: '150–250 mcg', mcg: 150, mcgHigh: 250 }
    ])
  },
  safety: ['<strong>Common:</strong> Injection-site irritation; generally well tolerated at research doses.'],
  warnings: ['Growth-factor peptides are avoided with active malignancy.']
});

files['cagrisema.html'] = page({
  title: 'CagriSema (Cagrilintide + Semaglutide)',
  format: 'Lyophilized Powder (amylin analog + GLP-1 blend)',
  sizes: [5, 10], defaultSize: 5, bacMl: 1, calcDose: 0.25, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.cagrisema',
  mechanism: 'A once-weekly blend of the amylin analog cagrilintide and the GLP-1 agonist semaglutide. The two hormones target complementary appetite pathways, producing greater appetite suppression and weight loss than either alone in trials.',
  bullets: [
    'Combines amylin (cagrilintide) and GLP-1 (semaglutide) mechanisms in one weekly shot.',
    'Titrated slowly to limit nausea, like other GLP-1 protocols.',
    'Doses below refer to the combined blend as labeled on the vial.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once weekly Sub-Q. Start low and titrate every ~4 weeks based on tolerance.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Start (wk 1–4)', doseLabel: '0.25 mg', mg: 0.25 },
      { tier: 'Titration', doseLabel: '0.5–1.7 mg', mg: 0.5, mgHigh: 1.7 },
      { tier: 'Higher range', doseLabel: '1.7–2.4 mg', mg: 1.7, mgHigh: 2.4 }
    ])
  },
  safety: ['<strong>Common:</strong> Nausea, reduced appetite, constipation or diarrhea, early fullness — usually worst right after a dose increase.'],
  warnings: ['Contraindicated with personal/family history of medullary thyroid carcinoma or MEN2.', 'Escalate slowly; stacking two appetite pathways increases GI side effects.']
});

files['survodutide.html'] = page({
  title: 'Survodutide',
  format: 'Lyophilized Powder (GLP-1 / glucagon dual agonist)',
  sizes: [10], defaultSize: 10, bacMl: 1, calcDose: 0.3, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.survodutide',
  mechanism: 'A once-weekly dual agonist of the GLP-1 and glucagon receptors. The GLP-1 arm suppresses appetite and improves glucose handling, while the glucagon arm raises energy expenditure and drives liver-fat breakdown — of particular interest for obesity and fatty-liver disease (MASH).',
  bullets: [
    'Dual GLP-1 + glucagon action combines appetite suppression with higher energy burn.',
    'Investigated for obesity and MASH.',
    'Requires slow titration over several weeks to limit nausea.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once weekly Sub-Q with gradual escalation, stepping up roughly every 2–4 weeks toward a maintenance dose.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Start', doseLabel: '0.3 mg', mg: 0.3 },
      { tier: 'Titration', doseLabel: '0.9–3.6 mg', mg: 0.9, mgHigh: 3.6 },
      { tier: 'Maintenance range', doseLabel: '3.6–6.0 mg', mg: 3.6, mgHigh: 6 }
    ])
  },
  safety: ['<strong>Common:</strong> Nausea, vomiting, diarrhea, constipation, and decreased appetite, especially during escalation.'],
  warnings: ['Investigational — not FDA-approved.', 'Contraindicated with personal/family history of medullary thyroid carcinoma or MEN2.']
});

files['mazdutide.html'] = page({
  title: 'Mazdutide',
  format: 'Lyophilized Powder (GLP-1 / glucagon dual agonist)',
  sizes: [5, 10], defaultSize: 5, bacMl: 1, calcDose: 1.5, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.mazdutide',
  mechanism: 'A once-weekly GLP-1 and glucagon receptor dual agonist built on the oxyntomodulin backbone. It pairs appetite suppression and glucose control with increased energy expenditure, and was the first glucagon/GLP-1 dual agonist approved for weight management (in China).',
  bullets: [
    'Dual GLP-1 + glucagon agonist for weight management and glycemic control.',
    'Reaches maintenance with a short 2-step titration in trials.',
    'Studied doses range from ~3 mg up to 9 mg once weekly.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once weekly Sub-Q with a short step-up titration. Maintenance doses in trials were commonly 4–9 mg.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Start', doseLabel: '1.5 mg', mg: 1.5 },
      { tier: 'Titration', doseLabel: '3–6 mg', mg: 3, mgHigh: 6 },
      { tier: 'Higher range', doseLabel: '6–9 mg', mg: 6, mgHigh: 9 }
    ])
  },
  safety: ['<strong>Common:</strong> Nausea, diarrhea, vomiting, decreased appetite; worst during dose increases.'],
  warnings: ['Not FDA-approved (approved in China only).', 'Contraindicated with personal/family history of medullary thyroid carcinoma or MEN2.']
});

files['retatrutide-cagrilintide.html'] = page({
  title: 'Retatrutide + Cagrilintide',
  format: 'Lyophilized Powder (triple agonist + amylin analog stack)',
  sizes: [10], defaultSize: 10, bacMl: 1, calcDose: 0.5, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.reta-cagri',
  mechanism: 'A weekly research stack pairing retatrutide (a GIP/GLP-1/glucagon triple agonist) with cagrilintide (an amylin analog). It layers a third appetite pathway (amylin) on top of retatrutide’s already broad receptor coverage.',
  bullets: [
    'Combines a triple incretin agonist with an amylin analog for maximal appetite effect.',
    'Aggressive combination — titrate very conservatively.',
    'Doses below refer to the combined blend as labeled on the vial.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once weekly Sub-Q. Given the potency of the stack, start low and increase slowly every ~4 weeks.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Start', doseLabel: '0.5 mg', mg: 0.5 },
      { tier: 'Titration', doseLabel: '1–2 mg', mg: 1, mgHigh: 2 },
      { tier: 'Higher range', doseLabel: '2–3.3 mg', mg: 2, mgHigh: 3.3 }
    ])
  },
  safety: ['<strong>Common:</strong> Pronounced nausea, appetite loss, and GI upset — combining multiple pathways amplifies these.'],
  warnings: ['Contraindicated with personal/family history of medullary thyroid carcinoma or MEN2.', 'Highly potent stack — conservative titration is important.']
});

files['mt-1.html'] = page({
  title: 'Melanotan-1 (MT-1)',
  format: 'Lyophilized Powder (α-MSH analog, afamelanotide)',
  sizes: [10], defaultSize: 10, bacMl: 2, calcDose: 500, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.mt-1',
  mechanism: 'A linear α-melanocyte-stimulating-hormone (α-MSH) analog that activates the MC1 receptor to increase eumelanin production. Compared with Melanotan-2 it is more selective for pigmentation and has little effect on libido or appetite.',
  bullets: [
    'MC1R-selective — tans with fewer of MT-2’s libido/appetite/nausea effects.',
    'Shorter-acting than MT-2, so daily dosing is common during a loading phase.',
    'Sun/UV exposure still drives the actual tanning response.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> A daily loading phase (~1–2 weeks) followed by less frequent maintenance is a common research-sheet pattern.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Loading', doseLabel: '500 mcg', mcg: 500 },
      { tier: 'Range', doseLabel: '500–1000 mcg', mcg: 500, mcgHigh: 1000 }
    ])
  },
  safety: ['<strong>Common:</strong> Facial flushing, mild nausea, and darkening of existing moles/freckles.'],
  warnings: ['Have any changing or atypical moles checked before and during use.', 'Does not protect against UV damage — burning is still possible.']
});

files['thymalin.html'] = page({
  title: 'Thymalin',
  format: 'Lyophilized Powder (thymic polypeptide bioregulator)',
  sizes: [10], defaultSize: 10, bacMl: 2, calcDose: 5, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.thymalin',
  mechanism: 'A thymus-derived polypeptide bioregulator studied for normalizing immune function — supporting T-cell maturation and rebalancing cytokine profiles. Part of the Khavinson bioregulator research alongside Epitalon.',
  bullets: [
    'Investigated as an immunomodulator that helps normalize (not just stimulate) immune signaling.',
    'Typically run as short courses of daily dosing, repeated periodically.',
    'Distinct from Thymosin Alpha-1 though both are thymic peptides.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Research-sheet patterns use a short course (~10 days) of daily Sub-Q, sometimes repeated seasonally.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Standard course', doseLabel: '5 mg', mg: 5 },
      { tier: 'Range', doseLabel: '5–10 mg', mg: 5, mgHigh: 10 }
    ])
  },
  safety: ['<strong>Common:</strong> Injection-site irritation; generally well tolerated in reports.'],
  warnings: ['Immune-active peptide — use caution with autoimmune conditions unless guided clinically.', 'No standardized human dosing established.']
});

files['ss-31.html'] = page({
  title: 'SS-31 (Elamipretide)',
  format: 'Lyophilized Powder (mitochondria-targeted tetrapeptide)',
  sizes: [10, 50], defaultSize: 10, bacMl: 2, calcDose: 5, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.ss-31',
  mechanism: 'A cell-permeable tetrapeptide that concentrates in the inner mitochondrial membrane and binds cardiolipin. By stabilizing cristae structure and the electron-transport chain it improves ATP output and reduces reactive-oxygen-species leak — the first mitochondria-targeted peptide to reach FDA approval (for Barth syndrome).',
  bullets: [
    'Binds cardiolipin to stabilize mitochondrial structure and energy production.',
    'Studied for mitochondrial myopathy, heart failure, and age-related decline.',
    'Clinical trials used 40 mg/day; community research protocols use much lower Sub-Q doses.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once daily Sub-Q is a common research-sheet pattern. Note published clinical dosing is 40 mg/day; the ranges below reflect lower community amounts.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Community range', doseLabel: '5 mg', mg: 5 },
      { tier: 'Range', doseLabel: '5–10 mg', mg: 5, mgHigh: 10 }
    ])
  },
  safety: ['<strong>Common:</strong> Injection-site reactions were the main finding in trials; otherwise a clean profile at studied doses.'],
  warnings: ['Approved dosing (40 mg/day) is specific to Barth syndrome; other uses are investigational.']
});

files['ll-37.html'] = page({
  title: 'LL-37',
  format: 'Lyophilized Powder (human cathelicidin antimicrobial peptide)',
  sizes: [5, 10], defaultSize: 5, bacMl: 2, calcDose: 100, calcUnit: 'mcg', route: 'subq',
  storageKey: 'vial.ll-37',
  mechanism: 'The only human cathelicidin — a 37–amino-acid host-defense peptide with broad antimicrobial, biofilm-disrupting, and immunomodulatory activity. Human clinical data exists only for topical wound application; injectable use is community-derived.',
  bullets: [
    'Broad antimicrobial and biofilm-disrupting activity; also modulates inflammation.',
    'Dose-sensitive: immunomodulatory at low levels, cytotoxic/pro-inflammatory when high.',
    'Only topical wound-healing trials exist in humans — subcutaneous use is unvalidated.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Community research-sheet patterns use small once-daily Sub-Q doses, often 5 days on / 2 off in 2–4 week blocks. There is no validated human injection dose.</p>',
  tables: {
    recon: subqRecon(),
    dose: doseTable([
      { tier: 'Conservative start', doseLabel: '100 mcg', mcg: 100 },
      { tier: 'Common range', doseLabel: '100–250 mcg', mcg: 100, mcgHigh: 250 }
    ])
  },
  safety: ['<strong>Common:</strong> Injection-site redness, induration, and mild pain; possible autoimmune-flare reports at higher doses.'],
  warnings: ['No human clinical data supports injectable LL-37 — only topical wound trials exist.', 'Higher concentrations can be cytotoxic and pro-inflammatory; start low.']
});

files['vip.html'] = page({
  title: 'VIP (Vasoactive Intestinal Peptide)',
  format: 'Lyophilized Powder (28-aa neuropeptide) — nasal spray',
  sizes: [5, 10], defaultSize: 5, sprayMl: 4, calcDose: 50, calcUnit: 'mcg', route: 'nasal', mode: 'nasal',
  storageKey: 'vial.vip',
  mechanism: 'A 28–amino-acid regulatory neuropeptide with broad anti-inflammatory, pulmonary-vasodilatory, and immune-balancing roles. It is best known as the final ("capstone") step of the Shoemaker CIRS protocol, delivered intranasally after upstream inflammatory markers are corrected.',
  bullets: [
    'Master regulatory neuropeptide studied for chronic inflammatory response syndrome (CIRS).',
    'Delivered intranasally in the published protocols; very short half-life systemically.',
    'Most effective only after upstream CIRS steps (exposure, binders, markers) are handled.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> The clinical protocol uses 50 mcg per spray, 4× daily (one spray per nostril). Titrate under guidance.</p>',
  tables: {
    recon: nasalRecon(),
    dose: doseTable([
      { tier: 'Per spray', doseLabel: '50 mcg', mcg: 50 },
      { tier: 'Daily protocol', doseLabel: '50–100 mcg', mcg: 50, mcgHigh: 100 }
    ], 'Nasal dosing', 'nasal', 'Sprays')
  },
  safety: ['<strong>Common:</strong> Flushing, lightheadedness, or brief blood-pressure changes; generally well tolerated in studies.'],
  warnings: ['Should follow (not precede) the upstream CIRS treatment steps to be effective.', 'Check lipase before use in the published protocol; avoid with pancreatic concerns unless guided.']
});

// --- Ready-to-use / non-mg-dosed products (no vial calculator) ---

files['hcg.html'] = simplePage({
  title: 'HCG',
  format: 'Lyophilized Powder (human chorionic gonadotropin) · 5,000 / 10,000 IU vials',
  mechanism: 'Human chorionic gonadotropin mimics luteinizing hormone (LH), signaling the testes to produce testosterone and maintain size and sperm production. It is used to preserve fertility and testicular function during or after suppressive hormone protocols.',
  bullets: [
    'Acts like LH to stimulate natural testosterone and sperm production.',
    'Used to prevent or reverse testicular atrophy on TRT, and to support fertility.',
    'Dosed in international units (IU), typically 2–3× per week.'
  ],
  usageHeading: '📅 Reconstitution & Dosing',
  usage: [
    '<strong>Reconstitution:</strong> Add bacteriostatic water to the vial (e.g. 5,000 IU + 5 mL BAC ≈ 1,000 IU per 0.1 mL / 10 units on a U-100 syringe). Choose the water volume that makes your dose land on an easy unit mark.',
    '<strong>Typical range:</strong> 250–500 IU two to three times per week for fertility/testicular support; higher short courses are sometimes used.',
    '<strong>Storage:</strong> Refrigerate after reconstitution (36–46°F / 2–8°C); use within a few weeks.'
  ],
  safety: ['<strong>Common:</strong> Injection-site irritation, mild water retention, acne, or mood changes from the rise in testosterone/estrogen.'],
  warnings: ['Can raise estrogen — monitor if prone to estrogen-related side effects.', 'Not for use with hormone-sensitive cancers unless clinically directed.']
});

files['igf-1-lr3.html'] = simplePage({
  title: 'IGF-1 LR3',
  format: 'Lyophilized Powder (Long R3 Insulin-like Growth Factor-1) · 100 / 1000 mcg vials',
  mechanism: 'A modified, long-acting version of IGF-1. The "Long R3" changes greatly extend its half-life and reduce binding to inhibitory proteins, so more active IGF-1 reaches receptors that drive cell growth, muscle hypertrophy, and nutrient partitioning.',
  bullets: [
    'Long-acting IGF-1 analog studied for muscle growth and recovery.',
    'Dosed in micrograms (mcg) — potent, so precision matters.',
    'Can lower blood sugar; keep fast-acting carbs available in research settings.'
  ],
  usageHeading: '📅 Reconstitution & Dosing',
  usage: [
    '<strong>Reconstitution:</strong> Reconstitute with bacteriostatic water. Example: a 1,000 mcg vial + 1 mL BAC = 100 mcg per 0.1 mL (10 units on a U-100 syringe).',
    '<strong>Typical range:</strong> 20–50 mcg per day is a common research-sheet range, often run in short blocks.',
    '<strong>Storage:</strong> Refrigerate after reconstitution; protect from light.'
  ],
  safety: ['<strong>Common:</strong> Hypoglycemia (shakiness, sweating, hunger), injection-site irritation, and water retention.'],
  warnings: ['Growth-factor peptides are avoided with active or prior malignancy.', 'Can cause low blood sugar — do not dose and skip meals; keep carbs on hand.']
});

files['lipo-b.html'] = simplePage({
  title: 'Lipo-B',
  format: 'Premixed Injectable Solution (MIC + B12 lipotropic blend) · 10 mL vial',
  mechanism: 'A ready-to-use lipotropic ("fat-metabolizing") blend — typically methionine, inositol, choline (MIC) plus vitamin B12. These compounds support the liver’s processing of fat and provide an energy/metabolism nudge alongside diet and activity.',
  bullets: [
    'Lipotropic MIC + B12 blend marketed to support fat metabolism and energy.',
    'Comes premixed — no reconstitution needed.',
    'One 10 mL vial commonly lasts ~2–3 months at typical weekly dosing.'
  ],
  usageHeading: '📅 Usage & Handling',
  usage: [
    '<strong>Ready to use:</strong> The solution is premixed — draw directly from the vial; do not add BAC water.',
    '<strong>Typical dosing:</strong> Commonly ~1 injection per week (often 0.5–1 mL) Sub-Q or IM, alongside diet and exercise.',
    '<strong>Storage:</strong> Refrigerate; protect from light. Discard if discolored or cloudy.'
  ],
  safety: ['<strong>Common:</strong> Mild injection-site stinging, temporary flushing, or a metallic taste from the B vitamins.'],
  warnings: ['A metabolism aid, not a standalone weight-loss treatment — results depend on diet and activity.', 'Avoid if allergic to any component (e.g. B12/cobalt).']
});

files['lipo-c.html'] = simplePage({
  title: 'Lipo-C',
  format: 'Premixed Injectable Solution (MIC + L-carnitine lipotropic blend) · 10 mL vial',
  mechanism: 'A ready-to-use lipotropic blend similar to Lipo-B but with L-carnitine added. L-carnitine helps shuttle fatty acids into mitochondria to be burned for energy, complementing the methionine/inositol/choline and B-vitamin components.',
  bullets: [
    'Lipotropic MIC blend plus L-carnitine for fat metabolism and energy support.',
    'Premixed and ready to inject — no reconstitution.',
    'One 10 mL vial commonly lasts ~2–3 months at typical weekly dosing.'
  ],
  usageHeading: '📅 Usage & Handling',
  usage: [
    '<strong>Ready to use:</strong> Premixed solution — draw directly; do not add BAC water.',
    '<strong>Typical dosing:</strong> Commonly 1–2 injections per week (often 0.5–1 mL) Sub-Q or IM, alongside diet and exercise.',
    '<strong>Storage:</strong> Refrigerate; protect from light. Discard if discolored or cloudy.'
  ],
  safety: ['<strong>Common:</strong> Injection-site stinging, flushing, or a fishy body odor from L-carnitine at higher intakes.'],
  warnings: ['A metabolism aid, not a standalone weight-loss treatment.', 'Avoid if allergic to any component.']
});

files['lemon-bottle.html'] = simplePage({
  title: 'Lemon Bottle',
  format: 'Premixed Fat-Dissolving Solution (riboflavin / bromelain / lecithin) · 10 mL vial',
  mechanism: 'A cosmetic fat-dissolving ("lipolysis") cocktail injected directly into a localized fat pocket — not a normal Sub-Q metabolic shot. Typical ingredients include riboflavin (B2), bromelain, and lecithin, marketed to break down fat cells in the treated area.',
  bullets: [
    'Localized fat-dissolving injection for small, stubborn fat pockets.',
    'Injected into the target area only — this is not a whole-body Sub-Q protocol.',
    'Premixed and ready to use.'
  ],
  usageHeading: '📅 Usage & Handling',
  usage: [
    '<strong>Local use only:</strong> Administered into a specific fat deposit via multiple small deposits — a technique best performed by a trained provider.',
    '<strong>Ready to use:</strong> Premixed — do not add BAC water.',
    '<strong>Storage:</strong> Refrigerate; protect from light. Discard if discolored.'
  ],
  safety: ['<strong>Common:</strong> Swelling, redness, bruising, warmth, and tenderness in the treated area for several days.'],
  warnings: ['Not a Sub-Q metabolic shot — improper placement can damage tissue.', 'Avoid over infection, near the eyes, or if allergic to any component (e.g. bromelain/pineapple).']
});

files['l-carnitine.html'] = simplePage({
  title: 'L-Carnitine',
  format: 'Injectable Solution (levocarnitine) · 5000 mg / 10 mL vial (500 mg/mL)',
  mechanism: 'An amino-acid derivative that transports long-chain fatty acids into the mitochondria where they are burned for energy. Supplemental L-carnitine is used to support fat metabolism, exercise recovery, and energy.',
  bullets: [
    'Shuttles fatty acids into mitochondria for energy production.',
    'Researched for fat metabolism, endurance, and recovery.',
    'Supplied as a ready-to-use 500 mg/mL solution.'
  ],
  usageHeading: '📅 Usage & Handling',
  usage: [
    '<strong>Ready to use:</strong> 500 mg per mL — draw the volume for your dose; do not add BAC water.',
    '<strong>Typical range:</strong> ~200–500 mg per dose, a few times weekly (often pre-workout) Sub-Q or IM. Split larger amounts across sites.',
    '<strong>Storage:</strong> Refrigerate; protect from light.'
  ],
  safety: ['<strong>Common:</strong> Injection-site stinging, and a fishy body odor at higher intakes.'],
  warnings: ['Large single Sub-Q volumes can sting — split doses across sites.', 'Consult a clinician if you have thyroid, kidney, or seizure history.']
});

files['acetic-acid-water.html'] = simplePage({
  title: 'Acetic Acid Water',
  format: 'Sterile Diluent (0.6% acetic acid solution) · 3 mL vial',
  mechanism: 'A mildly acidic sterile diluent used to reconstitute peptides that dissolve poorly in plain or bacteriostatic water. The low acetic-acid concentration helps fully dissolve "sticky" peptides before they are diluted for use.',
  bullets: [
    'Specialty diluent for peptides that won’t fully dissolve in BAC or sterile water.',
    'Contains ~0.6% acetic acid — used in small amounts to solubilize, then topped with BAC/sterile water.',
    'Not an active compound; it is a reconstitution aid only.'
  ],
  usageHeading: '📅 Usage & Handling',
  usage: [
    '<strong>How it’s used:</strong> Add a small amount to dissolve a stubborn peptide, then bring the vial to final volume with bacteriostatic or sterile water.',
    '<strong>Sanitation:</strong> Wipe the stopper with 70% isopropyl alcohol before each draw.',
    '<strong>Storage:</strong> Store per label; keep sterile and discard if cloudy or discolored.'
  ],
  safety: ['<strong>Common:</strong> Can cause more injection-site stinging than plain BAC water because of the acidity.'],
  warnings: ['Use only the minimum needed to dissolve, then dilute — do not inject large volumes of acidic diluent.', 'For reconstitution use only.']
});

files['snap-8.html'] = simplePage({
  title: 'SNAP-8',
  format: 'Lyophilized Powder (Acetyl Octapeptide-3) · 10 mg · topical cosmetic',
  mechanism: 'A cosmetic octapeptide (an extension of Argireline) that mimics the N-terminal end of the SNAP-25 protein. By competing for a spot in the SNARE complex it is designed to soften the muscle micro-contractions behind expression lines — a gentle, reversible, topical "Botox-like" concept.',
  bullets: [
    'Topical anti-wrinkle peptide aimed at expression lines (forehead, crow’s feet).',
    'Reversible and far milder than injectable neurotoxins; effects are gradual.',
    'Used in serums/creams, not injected — skin penetration is the limiting factor.'
  ],
  usageHeading: '📅 Usage & Handling',
  usage: [
    '<strong>Topical formulation:</strong> Dissolve in sterile/distilled water and blend into a serum base (commonly a ~3–10% peptide solution in the finished product).',
    '<strong>Application:</strong> Apply to clean skin once or twice daily; results build over several weeks of consistent use.',
    '<strong>Storage:</strong> Keep lyophilized powder cold; refrigerate the finished serum and use within its stability window.'
  ],
  safety: ['<strong>Common:</strong> Generally well tolerated topically; occasional mild irritation or redness.'],
  warnings: ['Cosmetic topical use — not intended for injection.', 'Patch-test before regular use if you have sensitive skin.']
});

Object.entries(files).forEach(([name, html]) => write(name, html));
console.log('done', Object.keys(files).length);
