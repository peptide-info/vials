/**
 * Vial size + BAC volume chips: recalculate recon concentration + syringe/spray volumes.
 *
 * Rules:
 * - BAC water can vary by vial size (data-bac-by-vial="10:1,30:1.5") as an author preference.
 * - Suggestion prefers the largest chip that keeps table doses ≤ 60 units (insulin/peptide pen max).
 * - User can override BAC with chips: 1 / 1.5 / 2 / 2.5 / 3 mL.
 * - Table always shows unit draws; notes when a draw exceeds the 60u pen max (100u syringes still OK).
 * - Doses larger than the selected vial still flag “choose a larger size”.
 */
(function () {
    const MAX_SINGLE_DRAW_UNITS = 60;
    const BAC_OPTIONS = [1, 1.5, 2, 2.5, 3];

    function parseList(raw) {
        return String(raw || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => {
                const n = parseFloat(s);
                return Number.isFinite(n) ? n : null;
            })
            .filter((n) => n != null);
    }

    function parseBacMap(raw) {
        const map = {};
        String(raw || '').split(',').forEach((pair) => {
            const [k, v] = pair.split(':').map((s) => s.trim());
            const vial = parseFloat(k);
            const bac = parseFloat(v);
            if (Number.isFinite(vial) && Number.isFinite(bac) && bac > 0) map[vial] = bac;
        });
        return map;
    }

    function niceNumber(n) {
        if (!Number.isFinite(n)) return '—';
        if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
        if (Math.abs(n) >= 10) return n.toFixed(1).replace(/\.0$/, '');
        return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    }

    function roundUnits(units) {
        if (!Number.isFinite(units) || units <= 0) return NaN;
        return units >= 10 ? Math.round(units) : Math.round(units * 10) / 10;
    }

    function formatUnits(units) {
        const rounded = roundUnits(units);
        if (!Number.isFinite(rounded)) return '—';
        return `<strong>${niceNumber(rounded)} units</strong>`;
    }

    function penMaxNote() {
        return `<em class="unit-note">(over ${MAX_SINGLE_DRAW_UNITS}u pen max)</em>`;
    }

    function formatSprays(sprays) {
        if (!Number.isFinite(sprays) || sprays <= 0) return '—';
        const rounded = Math.round(sprays * 10) / 10;
        return `<strong>${niceNumber(rounded)} spray${rounded === 1 ? '' : 's'}</strong>`;
    }

    function unitsForMg(doseMg, vialMg, bacMl) {
        return (doseMg / vialMg) * bacMl * 100;
    }

    function mcgPerUnit(vialMg, bacMl) {
        return (vialMg * 1000) / (bacMl * 100);
    }

    function mcgPerSpray(vialMg, sprayMl) {
        return (vialMg * 1000) / sprayMl * 0.1;
    }

    function snapToBacOption(bac) {
        if (!Number.isFinite(bac) || bac <= 0) return BAC_OPTIONS[0];
        if (BAC_OPTIONS.includes(bac)) return bac;
        const nearest = BAC_OPTIONS.reduce((best, opt) => (
            Math.abs(opt - bac) < Math.abs(best - bac) ? opt : best
        ), BAC_OPTIONS[0]);
        return Math.abs(nearest - bac) < 0.05 ? nearest : nearest;
    }

    function doseMgFromUnitsEl(el) {
        if (el.hasAttribute('data-dose-mg')) return parseFloat(el.getAttribute('data-dose-mg'));
        if (el.hasAttribute('data-dose-mcg')) return parseFloat(el.getAttribute('data-dose-mcg')) / 1000;
        return NaN;
    }

    function doseMgHighFromUnitsEl(el) {
        if (el.hasAttribute('data-dose-mg-high')) return parseFloat(el.getAttribute('data-dose-mg-high'));
        if (el.hasAttribute('data-dose-mcg-high')) return parseFloat(el.getAttribute('data-dose-mcg-high')) / 1000;
        return NaN;
    }

    /** Table doses that physically fit in the selected vial (used for BAC suggestion). */
    function collectInVialDoses(vialMg) {
        const doses = [];
        document.querySelectorAll('[data-units]').forEach((el) => {
            const low = doseMgFromUnitsEl(el);
            const high = doseMgHighFromUnitsEl(el);
            if (Number.isFinite(low) && low > 0 && low <= vialMg + 1e-9) doses.push(low);
            if (Number.isFinite(high) && high > 0 && high <= vialMg + 1e-9) doses.push(high);
        });
        return doses;
    }

    function bacKeepsDosesUnderPenMax(vialMg, bacMl, doses) {
        if (!doses.length) return true;
        return doses.every((d) => unitsForMg(d, vialMg, bacMl) <= MAX_SINGLE_DRAW_UNITS + 0.05);
    }

    function recommendedBacMl(root, vialMg) {
        const map = parseBacMap(root.dataset.bacByVial);
        const doses = collectInVialDoses(vialMg);
        const authorRaw = Number.isFinite(map[vialMg])
            ? map[vialMg]
            : parseFloat(root.dataset.bacMl);
        const author = Number.isFinite(authorRaw) && authorRaw > 0
            ? snapToBacOption(authorRaw)
            : null;

        const working = BAC_OPTIONS.filter((bac) => bacKeepsDosesUnderPenMax(vialMg, bac, doses));

        // Prefer author BAC when it still keeps table doses ≤ pen max
        if (author != null && bacKeepsDosesUnderPenMax(vialMg, author, doses)) {
            return author;
        }

        // Otherwise largest workable BAC (more comfortable volume) still under 60u
        if (working.length) {
            return working[working.length - 1];
        }

        // Impossible with chip set (dose is a large fraction of the vial) → densest mix
        return BAC_OPTIONS[0];
    }

    function suggestedBacKeepsPenMax(root, vialMg, suggestedBac) {
        return bacKeepsDosesUnderPenMax(vialMg, suggestedBac, collectInVialDoses(vialMg));
    }

    function maxDoseForSingleDraw(vialMg, bacMl) {
        return (MAX_SINGLE_DRAW_UNITS / 100) * (vialMg / bacMl);
    }

    function applyCalcDefaults(cfg) {
        const next = {
            mg: cfg.vialMg,
            ml: cfg.bacMl,
            dose: cfg.calcDose,
            unit: cfg.calcUnit,
            route: cfg.route
        };
        window.activeCalcDefaults = next;
        window.activeEmailDefaults = next;

        const mg1 = document.getElementById('pop_mg_1');
        const ml1 = document.getElementById('pop_ml_1');
        const dose1 = document.getElementById('pop_dose_1');
        const unit1 = document.getElementById('pop_unit_1');
        if (mg1 && cfg.vialMg) mg1.value = cfg.vialMg;
        if (ml1 && cfg.bacMl) ml1.value = cfg.bacMl;
        if (dose1 && cfg.calcDose) dose1.value = cfg.calcDose;
        if (unit1 && cfg.calcUnit) unit1.value = cfg.calcUnit;
    }

    function unitCellHtml(doseMg, vialMg, bacMl) {
        if (!Number.isFinite(doseMg) || doseMg <= 0) return '—';
        if (doseMg > vialMg + 1e-9) {
            return `<em>Exceeds this vial — choose a larger size</em>`;
        }
        const units = unitsForMg(doseMg, vialMg, bacMl);
        const html = formatUnits(units);
        if (units > MAX_SINGLE_DRAW_UNITS + 0.05) {
            return `${html} ${penMaxNote()}`;
        }
        return html;
    }

    function unitRangeHtml(lowMg, highMg, vialMg, bacMl) {
        if (!Number.isFinite(lowMg) || !Number.isFinite(highMg)) return '—';
        if (lowMg > vialMg + 1e-9) {
            return `<em>Exceeds this vial — choose a larger size</em>`;
        }
        const cappedHigh = Math.min(highMg, vialMg);
        const lowU = unitsForMg(lowMg, vialMg, bacMl);
        const highU = unitsForMg(cappedHigh, vialMg, bacMl);
        let html = `<strong>${niceNumber(roundUnits(lowU))}–${niceNumber(roundUnits(highU))} units</strong>`;
        if (highMg > vialMg + 1e-9) {
            html += ` <em class="unit-note">(upper end exceeds this vial)</em>`;
        } else if (highU > MAX_SINGLE_DRAW_UNITS + 0.05) {
            html += ` ${penMaxNote()}`;
        }
        return html;
    }

    function updatePage(root, state) {
        const vialMg = state.vialMg;
        const bacMl = state.bacMl;
        const sprayMl = parseFloat(root.dataset.sprayMl) || 0;
        const mode = (root.dataset.mode || 'subq').toLowerCase();
        const calcDose = parseFloat(root.dataset.calcDose);
        const calcUnit = root.dataset.calcUnit || 'mg';
        const route = root.dataset.route || (mode === 'nasal' ? 'nasal' : 'subq');
        const labelUnit = root.dataset.sizeUnit || 'mg';
        const maxSingle = maxDoseForSingleDraw(vialMg, bacMl);
        const suggestedBac = recommendedBacMl(root, vialMg);
        const suggestionFitsPen = suggestedBacKeepsPenMax(root, vialMg, suggestedBac);

        document.querySelectorAll('[data-vial-mg]').forEach((el) => {
            el.textContent = `${niceNumber(vialMg)} ${labelUnit}`;
        });

        document.querySelectorAll('[data-vial-bac]').forEach((el) => {
            el.textContent = `${niceNumber(bacMl)} mL`;
        });

        document.querySelectorAll('[data-vial-conc]').forEach((el) => {
            if (mode === 'nasal' && sprayMl > 0) {
                const perSpray = mcgPerSpray(vialMg, sprayMl);
                const mgPerMl = vialMg / sprayMl;
                el.innerHTML = `${niceNumber(mgPerMl)} mg/mL finished spray → <strong>${niceNumber(perSpray)} mcg per 0.1 mL spray</strong>`;
                return;
            }
            const mgPerMl = vialMg / bacMl;
            const perUnit = mcgPerUnit(vialMg, bacMl);
            if (perUnit >= 100) {
                el.innerHTML = `${niceNumber(mgPerMl)} mg per 1 mL <em>(${niceNumber(perUnit / 1000)} mg per syringe unit / 1 mg ≈ ${niceNumber(1000 / perUnit)} units)</em>`;
            } else {
                el.innerHTML = `${niceNumber(mgPerMl)} mg per 1 mL <em>(${niceNumber(perUnit)} mcg per syringe unit)</em>`;
            }
        });

        document.querySelectorAll('[data-vial-max-draw]').forEach((el) => {
            el.textContent = `${niceNumber(Math.min(vialMg, maxSingle))} ${labelUnit}`;
        });

        document.querySelectorAll('[data-units]').forEach((el) => {
            const doseMg = doseMgFromUnitsEl(el);
            const doseMgHigh = doseMgHighFromUnitsEl(el);

            const row = el.closest('tr');
            // Only dim rows that can't fit in the vial; over-60 still shows useful numbers.
            const exceedsVial = Number.isFinite(doseMg) && doseMg > vialMg + 1e-9;
            if (row) {
                row.classList.toggle('dose-impractical', exceedsVial);
                const overPen = !exceedsVial && mode !== 'nasal' && Number.isFinite(doseMg)
                    && unitsForMg(doseMg, vialMg, bacMl) > MAX_SINGLE_DRAW_UNITS + 0.05;
                row.classList.toggle('dose-over-pen', overPen);
            }

            if (mode === 'nasal' && sprayMl > 0) {
                const per = mcgPerSpray(vialMg, sprayMl);
                if (Number.isFinite(doseMgHigh) && Number.isFinite(doseMg)) {
                    const low = (doseMg * 1000) / per;
                    const high = (doseMgHigh * 1000) / per;
                    el.innerHTML = `<strong>${niceNumber(low)}–${niceNumber(high)} sprays</strong>`;
                } else if (Number.isFinite(doseMg)) {
                    el.innerHTML = formatSprays((doseMg * 1000) / per);
                }
                return;
            }

            if (Number.isFinite(doseMgHigh) && Number.isFinite(doseMg)) {
                el.innerHTML = unitRangeHtml(doseMg, doseMgHigh, vialMg, bacMl);
                return;
            }
            if (Number.isFinite(doseMg)) {
                el.innerHTML = unitCellHtml(doseMg, vialMg, bacMl);
            }
        });

        // Sync BAC chip active state + suggested hint
        root.querySelectorAll('.bac-chip').forEach((btn) => {
            const val = parseFloat(btn.dataset.bac);
            const on = Math.abs(val - bacMl) < 0.05;
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.classList.toggle('is-active', on);
            btn.classList.toggle('is-suggested', Math.abs(val - suggestedBac) < 0.05);
        });

        const hint = root.querySelector('[data-bac-hint]');
        if (hint) {
            if (Math.abs(bacMl - suggestedBac) < 0.05) {
                hint.textContent = suggestionFitsPen
                    ? `Suggested for this vial: ${niceNumber(suggestedBac)} mL (keeps common doses ≤${MAX_SINGLE_DRAW_UNITS} units on a pen).`
                    : `Suggested for this vial: ${niceNumber(suggestedBac)} mL (densest mix; some listed doses still need >${MAX_SINGLE_DRAW_UNITS} units — fine on a 100u syringe).`;
            } else {
                hint.textContent = `Showing ${niceNumber(bacMl)} mL mix. Suggested for this vial is ${niceNumber(suggestedBac)} mL.`;
            }
        }

        applyCalcDefaults({
            vialMg,
            bacMl: mode === 'nasal' && sprayMl > 0 ? sprayMl : bacMl,
            calcDose: Number.isFinite(calcDose) ? calcDose : (calcUnit === 'mcg' ? 250 : 2),
            calcUnit,
            route
        });

        document.dispatchEvent(new CustomEvent('vialsizechange', {
            detail: { vialMg, bacMl, sprayMl, mode, maxSingleDrawMg: maxSingle, suggestedBac }
        }));
    }

    function initPicker(root) {
        const sizes = parseList(root.dataset.sizes);
        if (!sizes.length) return;

        const mode = (root.dataset.mode || 'subq').toLowerCase();
        const showBac = mode !== 'nasal' && root.dataset.hideBac !== '1';
        const storageKey = root.dataset.storageKey || `vial.${location.pathname}`;
        const bacStorageKey = `${storageKey}.bac`;
        const params = new URLSearchParams(location.search);
        const fromQuery = parseFloat(params.get('vial'));
        const fromStore = parseFloat(localStorage.getItem(storageKey));
        const fallback = parseFloat(root.dataset.default) || sizes[0];
        let selectedVial = sizes.includes(fromQuery) ? fromQuery
            : (sizes.includes(fromStore) ? fromStore : fallback);

        // Always start from the dose-table suggestion. Stale ?bac= / localStorage
        // values (e.g. old 2 mL defaults) must not beat a denser suggested mix.
        let selectedBac = recommendedBacMl(root, selectedVial);
        if (!BAC_OPTIONS.includes(selectedBac)) selectedBac = snapToBacOption(selectedBac);

        const bacQuery = parseFloat(params.get('bac'));
        const bacStore = parseFloat(localStorage.getItem(bacStorageKey));
        const tableDoses = collectInVialDoses(selectedVial);

        const acceptStoredBac = (candidate, suggested) => {
            if (!BAC_OPTIONS.includes(candidate)) return suggested;
            const candOk = bacKeepsDosesUnderPenMax(selectedVial, candidate, tableDoses);
            const sugOk = bacKeepsDosesUnderPenMax(selectedVial, suggested, tableDoses);
            // Keep an explicit pick when it still meets the pen-max rule
            if (candOk) return candidate;
            // If suggestion is denser / better for pen max, prefer it over a dilute stale value
            if (sugOk || candidate > suggested) return suggested;
            return candidate;
        };

        if (BAC_OPTIONS.includes(bacQuery)) {
            selectedBac = acceptStoredBac(bacQuery, selectedBac);
        } else if (BAC_OPTIONS.includes(bacStore)) {
            selectedBac = acceptStoredBac(bacStore, selectedBac);
        }

        const bacRow = showBac ? `
            <div class="vial-picker-row">
                <span class="vial-picker-label">BAC water</span>
                <div class="vial-chip-row" role="group" aria-label="BAC water volume">
                    ${BAC_OPTIONS.map((b) => `
                        <button type="button" class="vial-chip bac-chip" data-bac="${b}" aria-pressed="false">
                            ${niceNumber(b)} mL
                        </button>
                    `).join('')}
                </div>
                <p class="vial-picker-hint" data-bac-hint></p>
            </div>
        ` : '';

        root.innerHTML = `
            <div class="vial-picker-row">
                <span class="vial-picker-label">Vial size</span>
                <div class="vial-chip-row" role="group" aria-label="Vial size">
                    ${sizes.map((s) => `
                        <button type="button" class="vial-chip size-chip" data-size="${s}" aria-pressed="false">
                            ${niceNumber(s)} ${root.dataset.sizeUnit || 'mg'}
                        </button>
                    `).join('')}
                </div>
            </div>
            ${bacRow}
        `;

        const persistUrl = () => {
            try {
                const url = new URL(location.href);
                url.searchParams.set('vial', String(selectedVial));
                if (showBac) url.searchParams.set('bac', String(selectedBac));
                history.replaceState({}, '', url);
            } catch (ignore) {}
        };

        const sync = ({ vial, bac, resetBacToSuggested } = {}) => {
            if (vial != null) selectedVial = vial;
            if (resetBacToSuggested) {
                let sug = recommendedBacMl(root, selectedVial);
                if (!BAC_OPTIONS.includes(sug)) sug = snapToBacOption(sug);
                selectedBac = sug;
            } else if (bac != null) {
                selectedBac = bac;
            }

            localStorage.setItem(storageKey, String(selectedVial));
            if (showBac) localStorage.setItem(bacStorageKey, String(selectedBac));

            root.querySelectorAll('.size-chip').forEach((btn) => {
                const on = parseFloat(btn.dataset.size) === selectedVial;
                btn.setAttribute('aria-pressed', on ? 'true' : 'false');
                btn.classList.toggle('is-active', on);
            });

            updatePage(root, {
                vialMg: selectedVial,
                bacMl: showBac ? selectedBac : recommendedBacMl(root, selectedVial)
            });
            persistUrl();
        };

        root.querySelectorAll('.size-chip').forEach((btn) => {
            btn.addEventListener('click', () => {
                sync({ vial: parseFloat(btn.dataset.size), resetBacToSuggested: true });
            });
        });

        root.querySelectorAll('.bac-chip').forEach((btn) => {
            btn.addEventListener('click', () => {
                sync({ bac: parseFloat(btn.dataset.bac) });
            });
        });

        sync({});
    }

    function boot() {
        document.querySelectorAll('#vial-picker, .vial-picker').forEach(initPicker);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
