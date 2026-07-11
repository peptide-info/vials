/**
 * Inject / refresh "Community notes" sections on peptide protocol pages.
 * Run: node scripts/inject-community-notes.js
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'peptides');

const DISCLAIMER =
  'Anecdotal reports from forums and user communities — not clinical evidence. Experiences vary widely.';

const NOTES = {
  'retatrutide.html': {
    usedFor: 'Aggressive fat loss and appetite shutdown; often preferred when tirz/sema plateaus.',
    watch: 'Nausea, food aversion, resting heart-rate bumps, and constipation are the usual early complaints.',
    avoidWith: 'Other strong GLP-1 / dual agonists at full dose (stacking incretins amplifies GI risk). Be careful with anything that also raises heart rate.',
    safety: 'Generally treated like other incretin mimetics: titrate slowly. Not for people with medullary thyroid cancer history / MEN2 discussions, or unexplained severe abdominal pain.'
  },
  'tirzepatide.html': {
    usedFor: 'Steady weight loss and appetite control with a dual GIP/GLP-1 profile.',
    watch: 'Nausea and “food noise” disappearing too hard — eat enough protein. Injection-site reactions happen.',
    avoidWith: 'Full-dose semaglutide or retatrutide at the same time. Alcohol on empty stomach can worsen GI sides.',
    safety: 'Well-traveled community compound with a clear titration culture. Still research-context only on this site.'
  },
  'semaglutide.html': {
    usedFor: 'Appetite control, weight loss, and glucose-related research themes.',
    watch: 'Classic GLP-1 GI suite — nausea, delayed emptying, constipation. Muscle loss if calories crash.',
    avoidWith: 'Other full-dose GLP-1s / retatrutide. High-fat binge meals right after dose spikes nausea for many.',
    safety: 'Among the most discussed peptides online; slow titration is the culture. Same gallbladder / pancreatitis caution chatter as other GLP-1s.'
  },
  'cagrilintide.html': {
    usedFor: 'Extra appetite silencing via amylin pathways; often talked about alongside GLP-1s in research stacks.',
    watch: 'Nausea can stack hard if combined with a GLP-1. Start conservative.',
    avoidWith: 'Jumping straight into high-dose GLP-1 + cagri together without a slow build.',
    safety: 'Less “solo star” chatter than sema/tirz; treat GI load as additive with any incretin.'
  },
  'tesamorelin.html': {
    usedFor: 'Visceral fat reduction and cleaner GH/IGF-1 support without exogenous GH.',
    watch: 'Water retention, joint stiffness, numb hands, and injection-site reactions.',
    avoidWith: 'Exogenous GH at the same time for most users; stacking secretagogues + GH is usually unnecessary and side-heavy.',
    safety: 'GH-axis compound — malignancy workups and uncontrolled diabetes are common “don’t casually run this” flags in community advice.'
  },
  'ipamorelin.html': {
    usedFor: 'Sleep quality, recovery, and a “clean” GH pulse with less hunger/cortisol chatter than older GHRPs.',
    watch: 'Head rush, tingling, water retention, vivid dreams.',
    avoidWith: 'Food/carbs in the peri-dose window if you care about pulse quality. Older GHRPs (GHRP-2/6) if you want the clean Ipa profile.',
    safety: 'Usually rated as one of the gentler GH secretagogues. Still a GH-axis agent — edema and IGF-1 sides matter at high frequency.'
  },
    'cjc-1295-dac.html': {
    usedFor: 'Infrequent GH/IGF-1 elevation when someone wants fewer pins than short-acting CJC stacks.',
    watch: 'More sustained GH bleed → more water retention, joint stiffness, and “always on” IGF-1 sides for some people.',
    avoidWith: 'CJC-1295 No DAC at the same time. Don’t dose it like a multi-daily pulse peptide.',
    safety: 'Community consensus is mixed — many prefer No DAC + Ipa for a cleaner pulse. With DAC needs extra caution and is easy to confuse at pharmacies/vendors.'
  },
  'cjc-1295-no-dac.html': {
    usedFor: 'Amplifying natural GH pulses — classic partner with Ipamorelin for recovery and body-comp support.',
    watch: 'Flushing, water retention, lethargy the next morning if dose is high.',
    avoidWith: 'CJC-1295 with DAC (different drug behavior). Don’t run a With-DAC schedule on a No DAC vial.',
    safety: 'Short-acting and widely stacked. Confirm the vial literally says No DAC — mislabels happen.'
  },
  'cjc-1295-no-dac-with-ipamorelin.html': {
    usedFor: 'The classic “pulse stack” for sleep, recovery, and lean body-comp support in one blend vial.',
    watch: 'Head rush after the pin, water retention, needing a real fasted window.',
    avoidWith: 'CJC with DAC, exogenous GH, and food around the dose. Don’t treat this blend like long-acting DAC CJC.',
    safety: 'Very common stack. Fasting discipline matters more than people expect. Same GH-axis cautions as the solos.'
  },
  'bpc-157.html': {
    usedFor: 'Tendon/ligament niggles, gut comfort, and general soft-tissue “heal faster” goals.',
    watch: 'Usually quiet; occasional site redness or dizziness. Results are highly anecdotal.',
    avoidWith: 'Active cancer treatment discussions — angiogenesis chatter makes some people pause all repair peptides.',
    safety: 'Often called one of the better-tolerated research peptides. Still not FDA-approved therapy; cycle length is usually finite.'
  },
  'tb-500.html': {
    usedFor: 'Flexibility, systemic recovery, and injury-adjacent mobility when BPC alone feels too local.',
    watch: 'Fatigue or head rush after larger loads; less “daily microdose” culture than BPC.',
    avoidWith: 'Same malignancy-caution conversations as other repair peptides. Redundant with a full Wolverine / GLOW vial if already covered.',
    safety: 'Generally well tolerated in community reports; loading then tapering is common.'
  },
  'bpc-157-tb-500.html': {
    usedFor: 'The “Wolverine” idea — soft-tissue repair plus systemic recovery in one vial.',
    watch: 'Confirm the BPC:TB ratio on the label; dosing talk online assumes different splits.',
    avoidWith: 'Piling on extra BPC/TB from separate vials without accounting for total exposure.',
    safety: 'Same profile as the solos combined. Popular and usually described as gentle, with the usual angiogenesis caveats.'
  },
  'glow.html': {
    usedFor: 'Skin quality, collagen vibes, and injury recovery in one copper-heavy repair blend.',
    watch: 'GHK-Cu can sting at the site; blue-ish tint under skin is reported. Copper load over long runs.',
    avoidWith: 'Extra high-dose GHK-Cu on the side without adjusting the blend draw. Indefinite daily use without breaks.',
    safety: 'Popular cosmetic/repair blend. Cycle off for copper clearance; verify 50/10/10 labeling.'
  },
  'klow.html': {
    usedFor: 'GLOW goals plus extra anti-inflammatory / gut-leaning KPV coverage.',
    watch: 'Same copper-site sting as GLOW; confirm all four amounts on the label.',
    avoidWith: 'Stacking another full KPV + GHK protocol on top blindly. Endless cycles without a copper break.',
    safety: 'Same blend caveats as GLOW with an added KPV angle. Still research-only combination — no trials on the four-peptide product itself.'
  },
  'ghk-cu.html': {
    usedFor: 'Skin firmness, wound-adjacent remodeling, and “copper peptide” anti-aging talk.',
    watch: 'Injection sting, temporary blue tint, flushing. Copper accumulation on long daily runs.',
    avoidWith: 'Other high-copper GHK blends at full dose the same day. Don’t inject topical HA serums.',
    safety: 'Topical and injectable cultures differ. Injectable needs clearer cycling than casual skincare use.'
  },
  'ghk-cu-100mg-with-bpc-157-10mg.html': {
    usedFor: 'Injectable skin/repair blend plus a separate topical GHK serum workflow.',
    watch: 'Never mix up the HA topical vial with the injectable blend. Site sting from copper.',
    avoidWith: 'Injecting anything labeled for topical/HA use. Double-dosing GHK from blend + solo without math.',
    safety: 'Clear vial discipline is the safety story here. Copper + repair caveats still apply.'
  },
  'kpv.html': {
    usedFor: 'Gut comfort and inflammatory “quieting” themes; also the K in KLOW.',
    watch: 'Usually mild; site irritation possible. Oral vs Sub-Q talk differs online.',
    avoidWith: 'Assuming it replaces medical care for IBD or infection. Redundant mega-stacks with KLOW + solo KPV.',
    safety: 'Often described as gentle. Evidence is preclinical/anecdotal for most use-cases people chase.'
  },
  'selank.html': {
    usedFor: 'Calm focus, anti-anxiety edge, and taking the edge off stressful days without heavy sedation for many users.',
    watch: 'Nasal irritation, mild fatigue, or blunted affect if overdone.',
    avoidWith: 'Heavy sedatives/alcohol if you’re testing response. Don’t treat nasal BAC mixes as fine — use sterile water/saline.',
    safety: 'Nasal nootropic with a relatively friendly reputation. Start low; it’s easy to overspray.'
  },
  'semax.html': {
    usedFor: 'Focus, mental stamina, and “get work done” cognitive sharpness.',
    watch: 'Overstimulation, headache, anxiety, vivid dreams, nasal burn.',
    avoidWith: 'Stacking other strong stimulants on day one. BAC water in the nose.',
    safety: 'More stimulating than Selank for most people — dial dose down if wired or irritable.'
  },
  'pt-141.html': {
    usedFor: 'Libido / arousal support (often PRN before intimacy).',
    watch: 'Nausea, flushing, blood-pressure changes, unexpected arousal timing.',
    avoidWith: 'Melanotan II the same day (overlapping melanocortin effects). Don’t redose within 24h casually.',
    safety: 'PRN culture is strong for a reason — sides are real. Nasal vs Sub-Q preference varies.'
  },
  'melanotan-2.html': {
    usedFor: 'Faster tanning / pigmentation with UV; some also chase libido sides.',
    watch: 'Nausea is famous. Freckling, mole darkening, facial flushing, spontaneous erections.',
    avoidWith: 'PT-141 stacks, aggressive UV burns, and ignoring changing moles.',
    safety: 'Higher “respect the sides” compound. Dermatologic monitoring comes up constantly in community advice.'
  },
  'epitalon.html': {
    usedFor: 'Longevity / sleep-quality courses rather than daily forever use.',
    watch: 'Subtle effects; some report vivid dreams or nothing noticeable.',
    avoidWith: 'Expecting a stimulant-like feel. Indefinite high-frequency use without breaks is uncommon advice.',
    safety: 'Usually described as quiet. Community use is course-based more than chronic.'
  },
  'mots-c.html': {
    usedFor: 'Metabolic flexibility, training energy, and “mito support” body-comp talk.',
    watch: 'Flushing, fatigue, or feeling overamped if dose is high.',
    avoidWith: 'Piling every metabolic peptide at once on week one.',
    safety: 'Mid-pack popularity; reports are mixed on how dramatic it feels. Still research-context.'
  },
  'nad.html': {
    usedFor: 'Energy, recovery, and “anti-aging infusion” culture — injectable sheets vary wildly by dose.',
    watch: 'Chest tightness, flushing, cramping, and feeling wiped if pushed too fast/high.',
    avoidWith: 'Hero doses on the first pin. Mixing with unclear clinic cocktails you can’t identify.',
    safety: 'Tolerability is dose- and rate-dependent. Start low; this one punishes cowboy dosing in anecdotes.'
  },
  'dsip.html': {
    usedFor: 'Sleep onset / deeper sleep experiments.',
    watch: 'Vivid dreams, next-day grogginess, or paradoxical wired feeling.',
    avoidWith: 'Alcohol and other sedatives while testing. Don’t expect ambien-like certainty.',
    safety: 'Hit-or-miss in community reports. Low stakes for many, but sleep compounds can backfire.'
  },
  'thymosin-alpha-1.html': {
    usedFor: 'Immune “support” themes and recovery during high-stress periods.',
    watch: 'Flu-like feelings, site redness, fatigue after pins.',
    avoidWith: 'Casual use in active autoimmune flares unless a clinician is involved. Don’t confuse with TB-500.',
    safety: 'Immune-active — community advice is more cautious than with BPC. Not a casual wellness pep for everyone.'
  }
};

function sectionHtml(note) {
  return `
    <hr>

    <h3>💬 Community notes</h3>
    <p class="community-disclaimer">${DISCLAIMER}</p>
    <div class="community-notes">
        <ul>
            <li><strong>Often used for:</strong> ${note.usedFor}</li>
            <li><strong>Watch for:</strong> ${note.watch}</li>
            <li><strong>Avoid stacking with:</strong> ${note.avoidWith}</li>
            <li><strong>Safety vibe:</strong> ${note.safety}</li>
        </ul>
    </div>
`;
}

function inject(file, note) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.warn('missing', file);
    return;
  }
  let html = fs.readFileSync(filePath, 'utf8');

  // Remove prior community notes block if re-running
  html = html.replace(/\n\s*<hr>\s*\n\s*<h3>💬 Community notes<\/h3>[\s\S]*?<div class="community-notes">[\s\S]*?<\/div>\s*/g, '\n');

  const block = sectionHtml(note);
  if (/<script\s+src="[^"]*vial-size\.js/.test(html)) {
    html = html.replace(/(\n)(\s*<script\s+src="[^"]*vial-size\.js)/, `${block}$1$2`);
  } else if (/<\/body>/.test(html)) {
    html = html.replace(/<\/body>/, `${block}\n</body>`);
  } else {
    console.warn('no insert point', file);
    return;
  }

  fs.writeFileSync(filePath, html);
  console.log('updated', file);
}

Object.entries(NOTES).forEach(([file, note]) => inject(file, note));
console.log('done', Object.keys(NOTES).length);
