/**
 * Vial size chips: recalculate recon concentration + syringe/spray volumes.
 * Page markup: #vial-picker with data-sizes, data-default, data-bac-ml, etc.
 */
(function () {
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

    function niceNumber(n) {
        if (!Number.isFinite(n)) return '—';
        if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
        if (Math.abs(n) >= 10) return n.toFixed(1).replace(/\.0$/, '');
        return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
    }

    function formatUnits(units) {
        if (!Number.isFinite(units) || units <= 0) return '—';
        const rounded = units >= 10 ? Math.round(units) : Math.round(units * 10) / 10;
        let text = `<strong>${niceNumber(rounded)} units</strong>`;
        if (rounded > 100) {
            const shots = Math.ceil(rounded / 100);
            text += ` <em>(${shots} shot${shots === 1 ? '' : 's'})</em>`;
        }
        return text;
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
        // total mcg in vial / total units in bacMl
        return (vialMg * 1000) / (bacMl * 100);
    }

    function mcgPerSpray(vialMg, sprayMl) {
        // 0.1 mL metered spray
        return (vialMg * 1000) / sprayMl * 0.1;
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

        // Live-update open calculator fields if present
        const mg1 = document.getElementById('pop_mg_1');
        const ml1 = document.getElementById('pop_ml_1');
        const dose1 = document.getElementById('pop_dose_1');
        const unit1 = document.getElementById('pop_unit_1');
        if (mg1 && cfg.vialMg) mg1.value = cfg.vialMg;
        if (ml1 && cfg.bacMl) ml1.value = cfg.bacMl;
        if (dose1 && cfg.calcDose) dose1.value = cfg.calcDose;
        if (unit1 && cfg.calcUnit) unit1.value = cfg.calcUnit;
    }

    function updatePage(root, vialMg) {
        const bacMl = parseFloat(root.dataset.bacMl) || 2;
        const sprayMl = parseFloat(root.dataset.sprayMl) || 0;
        const mode = (root.dataset.mode || 'subq').toLowerCase();
        const calcDose = parseFloat(root.dataset.calcDose);
        const calcUnit = root.dataset.calcUnit || 'mg';
        const route = root.dataset.route || (mode === 'nasal' ? 'nasal' : 'subq');
        const labelUnit = root.dataset.sizeUnit || 'mg';

        document.querySelectorAll('[data-vial-mg]').forEach((el) => {
            el.textContent = `${niceNumber(vialMg)} ${labelUnit}`;
        });

        document.querySelectorAll('[data-vial-bac]').forEach((el) => {
            el.textContent = `${niceNumber(bacMl)} mL`;
        });

        // Concentration blurbs
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
                const low = unitsForMg(doseMg, vialMg, bacMl);
                const high = unitsForMg(doseMgHigh, vialMg, bacMl);
                el.innerHTML = `<strong>${niceNumber(low >= 10 ? Math.round(low) : Math.round(low * 10) / 10)}–${niceNumber(high >= 10 ? Math.round(high) : Math.round(high * 10) / 10)} units</strong>`;
                return;
            }
            if (Number.isFinite(doseMg)) {
                el.innerHTML = formatUnits(unitsForMg(doseMg, vialMg, bacMl));
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
            detail: { vialMg, bacMl, sprayMl, mode }
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
            // Keep URL shareable without reload spam
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
