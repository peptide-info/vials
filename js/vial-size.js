/**
 * Vial size chips: recalculate recon concentration + syringe/spray volumes.
 *
 * Rules:
 * - BAC water can vary by vial size (data-bac-by-vial="10:1,30:1.5").
 * - Single Sub-Q draws must stay ≤ 60 units on a U-100 syringe.
 * - Never suggest multi-shot draws; point to a larger vial / denser mix instead.
 */
(function () {
    const MAX_SINGLE_DRAW_UNITS = 60;

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

    function collectPageDosesMg() {
        const doses = [];
        document.querySelectorAll('[data-units]').forEach((el) => {
            if (el.hasAttribute('data-dose-mg')) {
                doses.push(parseFloat(el.getAttribute('data-dose-mg')));
            }
            if (el.hasAttribute('data-dose-mg-high')) {
                doses.push(parseFloat(el.getAttribute('data-dose-mg-high')));
            }
            if (el.hasAttribute('data-dose-mcg')) {
                doses.push(parseFloat(el.getAttribute('data-dose-mcg')) / 1000);
            }
            if (el.hasAttribute('data-dose-mcg-high')) {
                doses.push(parseFloat(el.getAttribute('data-dose-mcg-high')) / 1000);
            }
        });
        return doses.filter((n) => Number.isFinite(n) && n > 0);
    }

    function resolveBacMl(root, vialMg) {
        const map = parseBacMap(root.dataset.bacByVial);
        let bac = map[vialMg];
        if (!Number.isFinite(bac)) bac = parseFloat(root.dataset.bacMl);
        if (!Number.isFinite(bac) || bac <= 0) bac = 2;
        return bac;
    }

    /** Largest dose that still fits in ≤60 units at this bac/vial. */
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
            return `<em>Over ${MAX_SINGLE_DRAW_UNITS} units at this mix — choose a larger vial</em>`;
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
            return `<em>Over ${MAX_SINGLE_DRAW_UNITS} units at this mix — choose a larger vial</em>`;
        }
        if (highMg > vialMg + 1e-9 || highU > MAX_SINGLE_DRAW_UNITS + 0.05) {
            const capped = Math.min(
                maxDoseForSingleDraw(vialMg, bacMl),
                vialMg
            );
            return `<strong>${niceNumber(roundUnits(lowU))} units</strong> <em>(upper end needs a larger vial; ~${niceNumber(capped)} mg max here)</em>`;
        }
        return `<strong>${niceNumber(roundUnits(lowU))}–${niceNumber(roundUnits(highU))} units</strong>`;
    }

    function updatePage(root, vialMg) {
        const bacMl = resolveBacMl(root, vialMg);
        const sprayMl = parseFloat(root.dataset.sprayMl) || 0;
        const mode = (root.dataset.mode || 'subq').toLowerCase();
        const calcDose = parseFloat(root.dataset.calcDose);
        const calcUnit = root.dataset.calcUnit || 'mg';
        const route = root.dataset.route || (mode === 'nasal' ? 'nasal' : 'subq');
        const labelUnit = root.dataset.sizeUnit || 'mg';
        const maxSingle = maxDoseForSingleDraw(vialMg, bacMl);

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

        applyCalcDefaults({
            vialMg,
            bacMl: mode === 'nasal' && sprayMl > 0 ? sprayMl : bacMl,
            calcDose: Number.isFinite(calcDose) ? calcDose : (calcUnit === 'mcg' ? 250 : 2),
            calcUnit,
            route
        });

        document.dispatchEvent(new CustomEvent('vialsizechange', {
            detail: { vialMg, bacMl, sprayMl, mode, maxSingleDrawMg: maxSingle }
        }));
    }

    function initPicker(root) {
        const sizes = parseList(root.dataset.sizes);
        if (!sizes.length) return;

        const storageKey = root.dataset.storageKey || `vial.${location.pathname}`;
        const params = new URLSearchParams(location.search);
        const fromQuery = parseFloat(params.get('vial'));
        const fromStore = parseFloat(localStorage.getItem(storageKey));
        const fallback = parseFloat(root.dataset.default) || sizes[0];
        let selected = sizes.includes(fromQuery) ? fromQuery
            : (sizes.includes(fromStore) ? fromStore : fallback);

        root.innerHTML = `
            <span class="vial-picker-label">Vial size</span>
            <div class="vial-chip-row" role="group" aria-label="Vial size">
                ${sizes.map((s) => `
                    <button type="button" class="vial-chip" data-size="${s}" aria-pressed="${s === selected ? 'true' : 'false'}">
                        ${niceNumber(s)} ${root.dataset.sizeUnit || 'mg'}
                    </button>
                `).join('')}
            </div>
        `;

        const sync = (size) => {
            selected = size;
            localStorage.setItem(storageKey, String(size));
            root.querySelectorAll('.vial-chip').forEach((btn) => {
                const on = parseFloat(btn.dataset.size) === size;
                btn.setAttribute('aria-pressed', on ? 'true' : 'false');
                btn.classList.toggle('is-active', on);
            });
            updatePage(root, size);
            try {
                const url = new URL(location.href);
                url.searchParams.set('vial', String(size));
                history.replaceState({}, '', url);
            } catch (ignore) {}
        };

        root.querySelectorAll('.vial-chip').forEach((btn) => {
            btn.addEventListener('click', () => sync(parseFloat(btn.dataset.size)));
        });

        sync(selected);
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
