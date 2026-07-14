const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'peptides');

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
    <script src="../global-nav.js?v=16"></script>
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
    <script src="../js/vial-size.js?v=6"></script>
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
  fs.writeFileSync(path.join(dir, name), html);
  console.log('wrote', name);
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
  sizes: [5, 10], defaultSize: 10, bacMl: 1, calcDose: 2, calcUnit: 'mg', route: 'subq',
  storageKey: 'vial.tesamorelin',
  mechanism: 'A stabilized analogue of growth hormone–releasing hormone (GHRH 1–44). It binds pituitary GHRH receptors to stimulate endogenous GH release in a pulsatile pattern.',
  bullets: [
    'Increases IGF-1 secondary to elevated GH output.',
    'Favors reduction of visceral adipose tissue while supporting lean-mass retention.',
    'Does not permanently suppress the pituitary feedback loop the way exogenous GH can.'
  ],
  dosingIntro: '<p><strong>Frequency:</strong> Once daily Sub-Q at bedtime on an empty stomach (or at least 90 minutes after the last meal). Common schedule: <strong>5 days on, 2 days off</strong>.</p><p><strong>Cycle length:</strong> Often planned around a ~10–20 week run, then reassess.</p>',
  tables: {
    recon: subqRecon('Single-vial reconstitution', '<p class="hint">Optional pen cart: reconstitute three 10 mg vials with 1.0 mL each and combine into a 3 mL cartridge (same 10 mg/mL concentration).</p>'),
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

Object.entries(files).forEach(([name, html]) => write(name, html));
console.log('done', Object.keys(files).length);
