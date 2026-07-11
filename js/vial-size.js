/**
 * Vial size + BAC volume chips: recalculate recon concentration + syringe/spray volumes.
 *
 * Rules:
 * - BAC water can vary by vial size (data-bac-by-vial="10:1,30:1.5") as the default suggestion.
 * - User can override BAC with chips: 1 / 1.5 / 2 / 2.5 / 3 mL.
 * - Single Sub-Q draws must stay ≤ 60 units on a U-100 syringe.
 * - Never suggest multi-shot draws; point to a larger vial / denser mix instead.
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

    function recommendedBacMl(root, vialMg) {
        const map = parseBacMap(root.dataset.bacByVial);
        let bac = map[vialMg];
        if (!Number.isFinite(bac)) bac = parseFloat(root.dataset.bacMl);
        if (!Number.isFinite(bac) || bac <= 0) bac = 2;
        // Snap to nearest chip option when close
        const nearest = BAC_OPTIONS.reduce((best, opt) => (
            Math.abs(opt - bac) < Math.abs(best - bac) ? opt : best
        ), BAC_OPTIONS[0]);
        return Math.abs(nearest - bac) < 0.05 ? nearest : bac;
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
        if (units > MAX_SINGLE_DRAW_UNITS + 0.05) {
            return `<em>Over ${MAX_SINGLE_DRAW_UNITS} units at this mix — use less BAC or a larger vial</em>`;
        }
        return formatUnits(units);
    }

    function unitRangeHtml(lowMg, highMg, vialMg, bacMl) {
        if (!Number.isFinite(lowMg) || !Number.isFinite(highMg)) return '—';
        if (lowMg > vialMg + 1e-9) {
            return `<em>Exceeds this vial — choose a larger size</em>`;
        }
        const lowU = unitsForMg(lowMg, vialMg, bacMl);
        const highU = unitsForMg(Math.min(highMg, vialMg), vialMg, bacMl);
        if (lowU > MAX_SINGLE_DRAW_UNITS + 0.05) {
            return `<em>Over ${MAX_SINGLE_DRAW_UNITS} units at this mix — use less BAC or a larger vial</em>`;
        }
        if (highMg > vialMg + 1e-9 || highU > MAX_SINGLE_DRAW_UNITS + 0.05) {
            const capped = Math.min(maxDoseForSingleDraw(vialMg, bacMl), vialMg);
            return `<strong>${niceNumber(roundUnits(lowU))} units</strong> <em>(upper end over 60u / vial; ~${niceNumber(capped)} mg max here)</em>`;
        }
        return `<strong>${niceNumber(roundUnits(lowU))}–${niceNumber(roundUnits(highU))} units</strong>`;
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
            const doseMg = el.hasAttribute('data-dose-mg')
                ? parseFloat(el.getAttribute('data-dose-mg'))
                : (el.hasAttribute('data-dose-mcg')
                    ? parseFloat(el.getAttribute('data-dose-mcg')) / 1000
                    : NaN);
            const doseMgHigh = el.hasAttribute('data-dose-mg-high')
                ? parseFloat(el.getAttribute('data-dose-mg-high'))
                : (el.hasAttribute('data-dose-mcg-high')
                    ? parseFloat(el.getAttribute('data-dose-mcg-high')) / 1000
                    : NaN);

            const row = el.closest('tr');
            const impractical = Number.isFinite(doseMg) && (
                doseMg > vialMg + 1e-9
                || (mode !== 'nasal' && unitsForMg(doseMg, vialMg, bacMl) > MAX_SINGLE_DRAW_UNITS + 0.05)
            );
            if (row) row.classList.toggle('dose-impractical', impractical);

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
                hint.textContent = `Suggested for this vial: ${niceNumber(suggestedBac)} mL (keeps common doses ≤60 units).`;
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

        let selectedBac = recommendedBacMl(root, selectedVial);
        const bacQuery = parseFloat(params.get('bac'));
        const bacStore = parseFloat(localStorage.getItem(bacStorageKey));
        if (BAC_OPTIONS.includes(bacQuery)) selectedBac = bacQuery;
        else if (BAC_OPTIONS.includes(bacStore)) selectedBac = bacStore;
        // If store/query missing, use recommended for current vial
        if (!BAC_OPTIONS.includes(bacQuery) && !BAC_OPTIONS.includes(bacStore)) {
            selectedBac = recommendedBacMl(root, selectedVial);
            if (!BAC_OPTIONS.includes(selectedBac)) {
                selectedBac = BAC_OPTIONS.reduce((best, opt) => (
                    Math.abs(opt - selectedBac) < Math.abs(best - selectedBac) ? opt : best
                ), BAC_OPTIONS[0]);
            }
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
                if (!BAC_OPTIONS.includes(sug)) {
                    sug = BAC_OPTIONS.reduce((best, opt) => (
                        Math.abs(opt - sug) < Math.abs(best - sug) ? opt : best
                    ), BAC_OPTIONS[0]);
                }
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
